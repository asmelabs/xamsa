import { ORPCError } from "@orpc/server";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { ablyRest } from "@xamsa/ably/server";
import type { Prisma } from "@xamsa/db";
import prisma from "@xamsa/db";
import type {
	AdvanceQuestionInputType,
	AdvanceQuestionOutputType,
	CompleteGameInputType,
	CompleteGameOutputType,
	CreateGameInputType,
	CreateGameOutputType,
	DeleteGameInputType,
	DeleteGameOutputType,
	FindOneGameInputType,
	FindOneGameOutputType,
	GameStartInputType,
	GameStartOutputType,
	HandleHostDisconnectInputType,
	HandleHostDisconnectOutputType,
	LeaveAsHostInputType,
	LeaveAsHostOutputType,
	RevealQuestionInputType,
	RevealQuestionOutputType,
	SkipQuestionInputType,
	UpdateGameStatusInputType,
	UpdateGameStatusOutputType,
} from "@xamsa/schemas/modules/game";
import {
	MIN_PLAYERS_PER_GAME_TO_START,
	MIN_TOPICS_PER_GAME_SUBSET,
} from "@xamsa/utils/constants";
import { publishBadgeEarnedMany } from "../badge/publish";
import { stripAllClicksForQuestionInTx } from "../click/remove-click";
import {
	duplicateBuzzBlockedForUser,
	userIdsWhoSawQuestionInPriorCompletedGames,
} from "./duplicate-question-policy";
import { finalizeGameQuestion, finalizeGameTopic } from "./finalize";
import {
	completeLobbyOnlyGame,
	FINALIZE_GAME_INTERACTIVE_TRANSACTION_OPTIONS,
	finalizeGame,
} from "./finalize-game";
import { resolveSessionTopicPackOrders } from "./included-topics";
import { scheduleGameWinnerEmailIfNeeded } from "./notify-game-winner-email";
import { generateUniqueGameCode } from "./utils";

function mapGameCompletionDeltas(raw: Prisma.JsonValue | null): {
	hostXpGained: number | null;
	eloDeltaByUserId: Record<string, number>;
} {
	if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
		return { hostXpGained: null, eloDeltaByUserId: {} };
	}
	const o = raw as Record<string, unknown>;
	const hostXpGained =
		typeof o.hostXpGained === "number" && Number.isFinite(o.hostXpGained)
			? Math.trunc(o.hostXpGained)
			: null;
	const eloDeltaByUserId: Record<string, number> = {};
	const m = o.eloDeltaByUserId;
	if (m && typeof m === "object" && !Array.isArray(m)) {
		for (const [k, v] of Object.entries(m)) {
			if (typeof v === "number" && Number.isFinite(v)) {
				eloDeltaByUserId[k] = Math.trunc(v);
			}
		}
	}
	return { hostXpGained, eloDeltaByUserId };
}

export async function createGame(
	input: CreateGameInputType,
	userId: string,
): Promise<CreateGameOutputType> {
	const pack = await prisma.pack.findFirst({
		where: {
			slug: input.pack,
			status: "published",
			OR: [
				{ authorId: userId },
				{ allowOthersHost: true, visibility: "public" },
			],
		},
		select: {
			slug: true,
			id: true,
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message:
				"Pack not found or you don't have permission to start a game with it",
		});
	}

	const existingGame = await prisma.game.findFirst({
		where: {
			hostId: userId,
			status: { not: "completed" },
		},
		select: {
			id: true,
		},
	});

	if (existingGame) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"You already have a game in progress. You can't start a new one until the current one is finished.",
		});
	}

	return await prisma.$transaction(async (tx) => {
		const code = await generateUniqueGameCode(tx);

		const game = await tx.game.create({
			data: {
				packId: pack.id,
				hostId: userId,
				code,
			},
		});

		return game;
	});
}

export async function deleteGame(
	input: DeleteGameInputType,
	userId: string,
): Promise<DeleteGameOutputType> {
	const game = await prisma.game.findUnique({
		where: {
			code: input.code,
			hostId: userId,
			status: "waiting", // currently only waiting games can be deleted
		},
		select: {
			id: true,
			code: true,
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", {
			message: "Game not found or you don't have permission to delete it",
		});
	}

	await prisma.game.delete({
		where: {
			id: game.id,
		},
	});

	return {
		code: game.code,
	};
}

export async function updateGameStatus(
	input: UpdateGameStatusInputType,
	userId: string,
): Promise<UpdateGameStatusOutputType> {
	const game = await prisma.game.findUnique({
		where: {
			code: input.code,
			hostId: userId,
			status: { not: "completed" },
		},
		select: {
			id: true,
			code: true,
			status: true,
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", {
			message:
				"Game not found or you don't have permission to update its status",
		});
	}

	/**
	 * RULES:
	 * waiting -> active
	 * active -> paused/completed
	 * paused -> active/completed
	 * completed -> cannot be updated
	 */

	if (game.status === "waiting") {
		if (input.status === "completed") {
			throw new ORPCError("BAD_REQUEST", {
				message: "You can't complete a game that has not started yet",
			});
		}

		if (input.status === "paused") {
			throw new ORPCError("BAD_REQUEST", {
				message: "You can't pause a game that has not started yet",
			});
		}

		// there must be at least 3 players in the game
		const totalActivePlayers = await prisma.player.count({
			where: {
				gameId: game.id,
				status: "playing",
			},
		});

		if (totalActivePlayers < MIN_PLAYERS_PER_GAME_TO_START) {
			throw new ORPCError("BAD_REQUEST", {
				message: "There must be at least 3 players in the game to start it",
			});
		}
	}

	// `completed` is only applied through `completeGame` / `leaveAsHost` /
	// abandonment flows, which call `finalizeGame` and roll up stats. Host UI
	// uses this procedure only for pause/resume.

	// pausedAt tracking: stamp on active->paused, clear on paused->active.
	// We only touch pausedAt on these exact transitions; anything else leaves
	// the existing value untouched so we don't clobber historical data.
	let pausedAtPatch: { pausedAt: Date | null } | null = null;
	if (game.status === "active" && input.status === "paused") {
		pausedAtPatch = { pausedAt: new Date() };
	} else if (game.status === "paused" && input.status === "active") {
		pausedAtPatch = { pausedAt: null };
	}

	const updated = await prisma.game.update({
		where: {
			id: game.id,
		},
		data: {
			status: input.status,
			...(pausedAtPatch ?? {}),
		},
		select: {
			code: true,
			status: true,
			pausedAt: true,
		},
	});

	// Real-time broadcast so every connected client flips immediately without
	// waiting for a findOne refetch.
	if (game.status === "active" && input.status === "paused") {
		const channel = ablyRest.channels.get(channels.game(updated.code));
		await channel.publish(GAME_EVENTS.GAME_PAUSED, {
			status: updated.status,
			pausedAt: updated.pausedAt,
			isAuthoritative: true,
		});
	} else if (game.status === "paused" && input.status === "active") {
		const channel = ablyRest.channels.get(channels.game(updated.code));
		await channel.publish(GAME_EVENTS.GAME_RESUMED, {
			status: updated.status,
			pausedAt: updated.pausedAt,
			isAuthoritative: true,
		});
	}

	return { code: updated.code };
}

export async function findOneGame(
	input: FindOneGameInputType,
	userId?: string,
): Promise<FindOneGameOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			code: true,
			status: true,
			startedAt: true,
			finishedAt: true,
			pausedAt: true,
			currentTopicOrder: true,
			currentQuestionOrder: true,
			isQuestionRevealed: true,
			winnerId: true,
			hostId: true,
			packId: true,
			completionDeltas: true,
			includedTopicPackOrders: true,
			settings: {
				select: {
					duplicateQuestionPolicy: true,
				},
			},
			pack: {
				select: {
					id: true,
					slug: true,
					name: true,
					description: true,
					language: true,
					pdr: true,
					author: {
						select: {
							username: true,
							name: true,
						},
					},
				},
			},
			players: {
				select: {
					id: true,
					score: true,
					rank: true,
					status: true,
					joinedAt: true,
					leftAt: true,
					userId: true,
					peakScore: true,
					lowestScore: true,
					totalClicks: true,
					correctAnswers: true,
					incorrectAnswers: true,
					expiredClicks: true,
					firstClicks: true,
					lastClicks: true,
					fastestClickMs: true,
					averageClickMs: true,
					longestCorrectStreak: true,
					longestWrongStreak: true,
					topicsPlayed: true,
					user: {
						select: {
							username: true,
							name: true,
							image: true,
						},
					},
				},
				orderBy: { joinedAt: "asc" },
			},
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", {
			message: `Game with code "${input.code}" not found`,
		});
	}

	const isHost = !!userId && game.hostId === userId;

	// find my player record (null if not a player)
	const myPlayerRaw = userId
		? (game.players.find((p) => p.userId === userId) ?? null)
		: null;

	const myPlayer = myPlayerRaw
		? (({ userId: _myUserId, ...rest }) => rest)(myPlayerRaw)
		: null;

	// strip userId from players in the response
	const players = game.players.map(({ userId: _, ...p }) => p);

	// find the current topic (if game has started)
	const currentTopicRow =
		game.currentTopicOrder !== null
			? await prisma.topic.findFirst({
					where: {
						packId: game.packId,
						order: game.currentTopicOrder,
					},
					select: {
						slug: true,
						name: true,
						description: true,
						order: true,
						tdr: true,
						questions: { select: { qdrScoredAttempts: true } },
					},
				})
			: null;

	const topicHasRatedDifficulty = currentTopicRow
		? currentTopicRow.questions.some((q) => q.qdrScoredAttempts > 0)
		: false;

	const currentTopic = currentTopicRow
		? isHost
			? {
					slug: currentTopicRow.slug,
					name: currentTopicRow.name,
					description: currentTopicRow.description,
					order: currentTopicRow.order,
					tdr: currentTopicRow.tdr,
					hasRatedDifficulty: topicHasRatedDifficulty,
				}
			: {
					slug: currentTopicRow.slug,
					name: currentTopicRow.name,
					description: currentTopicRow.description,
					order: currentTopicRow.order,
				}
		: null;

	// find the current question (if one is active)
	const currentQuestionRecord =
		game.currentTopicOrder !== null && game.currentQuestionOrder !== null
			? await prisma.question.findFirst({
					where: {
						order: game.currentQuestionOrder,
						topic: {
							packId: game.packId,
							order: game.currentTopicOrder,
						},
					},
					select: {
						id: true,
						slug: true,
						order: true,
						text: true,
						answer: true,
						acceptableAnswers: true,
						explanation: true,
						qdr: true,
						qdrScoredAttempts: true,
					},
				})
			: null;

	// public question view — fields appear only after reveal
	const currentQuestion = currentQuestionRecord
		? {
				order: currentQuestionRecord.order,
				points: currentQuestionRecord.order * 100,
				text: game.isQuestionRevealed ? currentQuestionRecord.text : null,
				answer: game.isQuestionRevealed ? currentQuestionRecord.answer : null,
				explanation: game.isQuestionRevealed
					? currentQuestionRecord.explanation
					: null,
				acceptableAnswers: game.isQuestionRevealed
					? currentQuestionRecord.acceptableAnswers
					: [],
			}
		: null;

	// fetch clicks for the current question only
	const clicks =
		currentQuestionRecord && game.currentTopicOrder !== null
			? await prisma.click.findMany({
					where: {
						game: { code: input.code },
						question: {
							order: currentQuestionRecord.order,
							topic: {
								packId: game.packId,
								order: game.currentTopicOrder,
							},
						},
					},
					select: {
						id: true,
						position: true,
						status: true,
						clickedAt: true,
						answeredAt: true,
						reactionMs: true,
						pointsAwarded: true,
						playerId: true,
					},
					orderBy: { position: "asc" },
				})
			: [];

	// public click data — strip analytics fields
	const publicClicks = clicks.map((c) => ({
		id: c.id,
		position: c.position,
		status: c.status,
		clickedAt: c.clickedAt,
		playerId: c.playerId,
	}));

	// host-only data (includes per-question QDR for the live question)
	const hostData = isHost
		? {
				currentQuestion: currentQuestionRecord,
				clickDetails: clicks,
			}
		: null;

	const sessionTopicPackOrders = await resolveSessionTopicPackOrders(
		game.packId,
		game.includedTopicPackOrders,
	);
	const packTotalTopics = sessionTopicPackOrders.length;

	const packHasRatedDifficulty = await prisma.question
		.count({
			where: {
				topic: { packId: game.packId },
				qdrScoredAttempts: { gt: 0 },
			},
		})
		.then((n) => n > 0);

	const { hostXpGained, eloDeltaByUserId } = mapGameCompletionDeltas(
		game.completionDeltas,
	);
	const rewardsRecorded = game.completionDeltas != null;

	let myDuplicateBuzzBlocked = false;
	let myDuplicateBuzzBlockedReason: "individual" | "room" | null = null;

	if (
		game.status === "active" &&
		!game.isQuestionRevealed &&
		userId &&
		myPlayerRaw?.status === "playing" &&
		currentQuestionRecord?.id
	) {
		const duplicatePolicy = game.settings?.duplicateQuestionPolicy ?? "none";
		if (duplicatePolicy !== "none") {
			const playingUserIds = game.players
				.filter((p) => p.status === "playing")
				.map((p) => p.userId);
			const candidateUserIds =
				duplicatePolicy === "block_individuals" ? [userId] : playingUserIds;
			const sawBefore = await userIdsWhoSawQuestionInPriorCompletedGames(
				prisma,
				{
					packId: game.packId,
					questionId: currentQuestionRecord.id,
					excludeGameId: game.id,
					candidateUserIds,
				},
			);
			const evalBuzz = duplicateBuzzBlockedForUser({
				policy: duplicatePolicy,
				currentUserId: userId,
				sawBefore,
			});
			myDuplicateBuzzBlocked = evalBuzz.blocked;
			myDuplicateBuzzBlockedReason = evalBuzz.because;
		}
	}

	let hostDuplicateBuzzNotice: FindOneGameOutputType["hostDuplicateBuzzNotice"] =
		null;

	if (
		isHost &&
		game.status === "active" &&
		!game.isQuestionRevealed &&
		currentQuestionRecord?.id
	) {
		const dupPolicy = game.settings?.duplicateQuestionPolicy ?? "none";
		if (dupPolicy !== "none") {
			const playingUserIds = game.players
				.filter((p) => p.status === "playing")
				.map((p) => p.userId);
			if (playingUserIds.length > 0) {
				const sawBefore = await userIdsWhoSawQuestionInPriorCompletedGames(
					prisma,
					{
						packId: game.packId,
						questionId: currentQuestionRecord.id,
						excludeGameId: game.id,
						candidateUserIds: playingUserIds,
					},
				);
				if (sawBefore.size > 0) {
					const affectedPlayers = game.players
						.filter((p) => p.status === "playing" && sawBefore.has(p.userId))
						.map((p) => ({
							playerId: p.id,
							displayName: p.user.name.split(" ")[0] ?? p.user.username,
						}));
					hostDuplicateBuzzNotice =
						dupPolicy === "block_room"
							? { mode: "room", affectedPlayers }
							: { mode: "individuals", affectedPlayers };
				}
			}
		}
	}

	return {
		code: game.code,
		status: game.status,
		startedAt: game.startedAt,
		finishedAt: game.finishedAt,
		pausedAt: game.pausedAt,
		currentTopicOrder: game.currentTopicOrder,
		currentQuestionOrder: game.currentQuestionOrder,
		isQuestionRevealed: game.isQuestionRevealed,
		winnerId: game.winnerId,
		hostId: game.hostId,
		pack: isHost
			? {
					slug: game.pack.slug,
					name: game.pack.name,
					description: game.pack.description,
					language: game.pack.language,
					author: game.pack.author,
					pdr: game.pack.pdr,
					hasRatedDifficulty: packHasRatedDifficulty,
				}
			: {
					slug: game.pack.slug,
					name: game.pack.name,
					description: game.pack.description,
					language: game.pack.language,
					author: game.pack.author,
				},
		packTotalTopics,
		sessionTopicPackOrders,
		currentTopic,
		currentQuestion,
		players,
		clicks: publicClicks,
		isHost,
		myPlayer,
		hostData,
		rewardsRecorded,
		hostXpGained,
		eloDeltaByUserId,
		myEloDelta:
			rewardsRecorded && userId && myPlayerRaw
				? (eloDeltaByUserId[userId] ?? 0)
				: null,
		myDuplicateBuzzBlocked,
		myDuplicateBuzzBlockedReason,
		hostDuplicateBuzzNotice,
	};
}

/**
 * start
 */
export async function startGame(
	input: GameStartInputType,
	userId: string,
): Promise<GameStartOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			hostId: true,
			status: true,
			packId: true,
			_count: {
				select: {
					players: { where: { status: "playing" } },
				},
			},
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", { message: "Game not found" });
	}

	if (game.hostId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the host can start the game",
		});
	}

	if (game.status !== "waiting") {
		throw new ORPCError("BAD_REQUEST", { message: "Game has already started" });
	}

	if (game._count.players < MIN_PLAYERS_PER_GAME_TO_START) {
		throw new ORPCError("BAD_REQUEST", {
			message: `At least ${MIN_PLAYERS_PER_GAME_TO_START} players are required to start the game`,
		});
	}

	const packTopics = await prisma.topic.findMany({
		where: { packId: game.packId },
		select: { order: true },
		orderBy: { order: "asc" },
	});
	const validOrders = new Set(packTopics.map((t) => t.order));
	const fullOrders = packTopics.map((t) => t.order);

	let persistedInclusion: number[] | null = null;
	let inclusion: number[];

	if (input.topicPackOrders != null && input.topicPackOrders.length > 0) {
		inclusion = [
			...new Set(input.topicPackOrders.map((x) => Math.trunc(x))),
		].sort((a, b) => a - b);
		if (inclusion.length < MIN_TOPICS_PER_GAME_SUBSET) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Select at least ${String(MIN_TOPICS_PER_GAME_SUBSET)} topics`,
			});
		}
		for (const o of inclusion) {
			if (!validOrders.has(o)) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Topic selection includes orders not in this pack",
				});
			}
		}
		persistedInclusion = inclusion;
	} else {
		inclusion = fullOrders;
	}

	if (inclusion.length === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Pack must have at least one topic with questions",
		});
	}

	const firstOrder = inclusion[0];
	if (firstOrder === undefined) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Pack must have at least one topic with questions",
		});
	}

	const firstTopic = await prisma.topic.findFirst({
		where: { packId: game.packId, order: firstOrder },
		select: {
			id: true,
			questions: {
				where: { order: 1 },
				select: { id: true },
				take: 1,
			},
		},
	});

	const firstQuestion = firstTopic?.questions[0];
	if (!firstTopic || !firstQuestion) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Pack must have at least one topic with questions",
		});
	}

	const firstQuestionId = firstQuestion.id;

	const now = new Date();
	const updated = await prisma.$transaction(async (tx) => {
		const gameRow = await tx.game.update({
			where: { id: game.id },
			data: {
				status: "active",
				startedAt: now,
				currentTopicOrder: firstOrder,
				currentQuestionOrder: 1,
				isQuestionRevealed: false,
				...(persistedInclusion != null
					? { includedTopicPackOrders: persistedInclusion }
					: {}),
			},
			select: {
				code: true,
				status: true,
				startedAt: true,
				currentTopicOrder: true,
				currentQuestionOrder: true,
			},
		});

		const gameTopic = await tx.gameTopic.create({
			data: {
				gameId: game.id,
				topicId: firstTopic.id,
				order: firstOrder,
				startedAt: now,
			},
			select: { id: true },
		});

		await tx.gameQuestion.create({
			data: {
				gameTopicId: gameTopic.id,
				questionId: firstQuestionId,
				order: 1,
				points: 100,
				status: "active",
				startedAt: now,
			},
		});

		// Elo at game start for QDR: snapshot every playing user's current `User.elo`.
		const playingPlayers = await tx.player.findMany({
			where: { gameId: game.id, status: "playing" },
			select: { id: true, userId: true },
		});
		if (playingPlayers.length > 0) {
			const userIds = [...new Set(playingPlayers.map((p) => p.userId))];
			const users = await tx.user.findMany({
				where: { id: { in: userIds } },
				select: { id: true, elo: true },
			});
			const eloByUserId = new Map(users.map((u) => [u.id, u.elo]));
			for (const p of playingPlayers) {
				await tx.player.update({
					where: { id: p.id },
					data: { eloAtGameStart: eloByUserId.get(p.userId) ?? 1000 },
				});
			}
		}

		await tx.gameSettings.upsert({
			where: { gameId: game.id },
			create: {
				gameId: game.id,
				allowLaterJoins: true,
				duplicateQuestionPolicy: input.duplicateQuestionPolicy,
			},
			update: {
				duplicateQuestionPolicy: input.duplicateQuestionPolicy,
			},
		});

		return gameRow;
	});

	// broadcast
	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.GAME_STARTED, {
		startedAt: updated.startedAt,
	});

	return updated;
}

/**
 * Internal helper: load the game + current question + current GameQuestion,
 * enforcing host, active state, and a valid current position. Shared by
 * reveal / advance / complete flows.
 */
async function loadHostGameContext(
	code: string,
	userId: string,
	options: { allowPaused?: boolean } = {},
) {
	const game = await prisma.game.findUnique({
		where: { code },
		select: {
			id: true,
			hostId: true,
			status: true,
			packId: true,
			currentTopicOrder: true,
			currentQuestionOrder: true,
			isQuestionRevealed: true,
			startedAt: true,
			includedTopicPackOrders: true,
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", { message: "Game not found" });
	}

	if (game.hostId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the host can perform this action",
		});
	}

	const allowPaused = options.allowPaused === true;
	const canPlay =
		game.status === "active" || (allowPaused && game.status === "paused");
	if (!canPlay) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				game.status === "paused" && !allowPaused
					? "Game is paused"
					: "Game is not active",
		});
	}

	if (game.currentTopicOrder === null || game.currentQuestionOrder === null) {
		throw new ORPCError("BAD_REQUEST", { message: "No active question" });
	}

	// Lazy/self-heal: older games were started before we began creating
	// GameTopic + GameQuestion rows at startGame time. If they're missing for
	// the current position, create them on-demand so host actions still work.
	let gameTopic = await prisma.gameTopic.findUnique({
		where: {
			gameId_order: {
				gameId: game.id,
				order: game.currentTopicOrder,
			},
		},
		select: { id: true, topicId: true, order: true },
	});

	if (!gameTopic) {
		const topicRow = await prisma.topic.findFirst({
			where: { packId: game.packId, order: game.currentTopicOrder },
			select: { id: true },
		});
		if (!topicRow) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Pack topic for current position not found",
			});
		}
		const created = await prisma.gameTopic.create({
			data: {
				gameId: game.id,
				topicId: topicRow.id,
				order: game.currentTopicOrder,
				startedAt: game.startedAt ?? new Date(),
			},
			select: { id: true, topicId: true, order: true },
		});
		gameTopic = created;
	}

	let gameQuestion = await prisma.gameQuestion.findUnique({
		where: {
			gameTopicId_order: {
				gameTopicId: gameTopic.id,
				order: game.currentQuestionOrder,
			},
		},
		select: { id: true, questionId: true, order: true },
	});

	if (!gameQuestion) {
		const questionRow = await prisma.question.findFirst({
			where: {
				topicId: gameTopic.topicId,
				order: game.currentQuestionOrder,
			},
			select: { id: true },
		});
		if (!questionRow) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Pack question for current position not found",
			});
		}
		const created = await prisma.gameQuestion.create({
			data: {
				gameTopicId: gameTopic.id,
				questionId: questionRow.id,
				order: game.currentQuestionOrder,
				points: game.currentQuestionOrder * 100,
				status: "active",
				startedAt: game.startedAt ?? new Date(),
			},
			select: { id: true, questionId: true, order: true },
		});
		gameQuestion = created;
	}

	const question = await prisma.question.findUnique({
		where: { id: gameQuestion.questionId },
		select: {
			id: true,
			order: true,
			text: true,
			answer: true,
			acceptableAnswers: true,
			explanation: true,
		},
	});

	if (!question) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Current question not found",
		});
	}

	return { game, gameTopic, gameQuestion, question };
}

/**
 * REVEAL QUESTION
 *
 * Manual reveal: host flips `isQuestionRevealed` so players can see the
 * question text + answer. Typically used when nobody buzzed, so the host has
 * to show the answer before moving on.
 */
export async function revealQuestion(
	input: RevealQuestionInputType,
	userId: string,
): Promise<RevealQuestionOutputType> {
	const { game, gameQuestion, question } = await loadHostGameContext(
		input.code,
		userId,
	);

	if (game.isQuestionRevealed) {
		// already revealed — idempotent no-op (but we still broadcast so late
		// subscribers catch up).
		const channel = ablyRest.channels.get(channels.game(input.code));
		await channel.publish(GAME_EVENTS.QUESTION_REVEALED, {
			order: question.order,
			text: question.text,
			answer: question.answer,
			explanation: question.explanation,
			acceptableAnswers: question.acceptableAnswers,
			expiredClicks: [],
			isAuthoritative: true,
		});
		return {
			order: question.order,
			text: question.text,
			answer: question.answer,
			explanation: question.explanation,
			acceptableAnswers: question.acceptableAnswers,
		};
	}

	const { expiredClicks } = await prisma.$transaction(async (tx) => {
		const now = new Date();
		const pending = await tx.click.findMany({
			where: {
				gameId: game.id,
				questionId: question.id,
				status: "pending",
			},
			select: { id: true, playerId: true },
		});

		if (pending.length > 0) {
			await tx.click.updateMany({
				where: { id: { in: pending.map((c) => c.id) } },
				data: {
					status: "expired",
					answeredAt: now,
					pointsAwarded: 0,
				},
			});
			for (const row of pending) {
				await tx.player.update({
					where: { id: row.playerId },
					data: { expiredClicks: { increment: 1 } },
				});
			}
		}

		await tx.game.update({
			where: { id: game.id },
			data: {
				isQuestionRevealed: true,
				...(pending.length > 0
					? {
							totalAnswers: { increment: pending.length },
							totalExpiredAnswers: { increment: pending.length },
						}
					: {}),
			},
		});

		await tx.gameQuestion.update({
			where: { id: gameQuestion.id },
			data: { wasRevealed: true },
		});

		return {
			expiredClicks: pending.map((c) => ({ id: c.id, playerId: c.playerId })),
		};
	});

	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.QUESTION_REVEALED, {
		order: question.order,
		text: question.text,
		answer: question.answer,
		explanation: question.explanation,
		acceptableAnswers: question.acceptableAnswers,
		expiredClicks,
		isAuthoritative: true,
	});

	return {
		order: question.order,
		text: question.text,
		answer: question.answer,
		explanation: question.explanation,
		acceptableAnswers: question.acceptableAnswers,
	};
}

/**
 * ADVANCE QUESTION
 *
 * Moves the game to the next question. Finalizes the leaving GameQuestion
 * (aggregates stats, backfills reactionMs, forces pending clicks to expired).
 * On a topic boundary (leaving q5), also finalizes the GameTopic and starts
 * a fresh GameTopic + GameQuestion for the next topic.
 *
 * Fails if the current question is not revealed or the game is already past
 * its final topic (host must call `completeGame` instead).
 */
export async function advanceQuestion(
	input: AdvanceQuestionInputType,
	userId: string,
): Promise<AdvanceQuestionOutputType> {
	const { game, gameTopic, gameQuestion } = await loadHostGameContext(
		input.code,
		userId,
	);

	if (!game.isQuestionRevealed) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Reveal the question before advancing",
		});
	}

	const currentQuestionOrder = game.currentQuestionOrder as number;
	const currentTopicOrder = game.currentTopicOrder as number;

	const inclusion = await resolveSessionTopicPackOrders(
		game.packId,
		game.includedTopicPackOrders,
	);
	const lastPackTopicOrder = inclusion[inclusion.length - 1];

	const isLastQuestionInTopic = currentQuestionOrder >= 5;
	const isLastTopicInPack =
		inclusion.length > 0 && currentTopicOrder === lastPackTopicOrder;

	if (isLastQuestionInTopic && isLastTopicInPack) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No more questions. Use 'Finish game' to complete the game.",
		});
	}

	// Pre-resolve the next position + its Question row so we can return the
	// full host payload without an extra roundtrip after commit.
	const now = new Date();
	let nextTopicOrder: number;
	let nextQuestionOrder: number;
	let nextTopicId: string;

	if (isLastQuestionInTopic) {
		const idx = inclusion.indexOf(currentTopicOrder);
		if (idx < 0 || idx >= inclusion.length - 1) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Next topic not found in session",
			});
		}
		const nextInSession = inclusion[idx + 1];
		if (nextInSession === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Next topic not found in session",
			});
		}
		nextTopicOrder = nextInSession;
		nextQuestionOrder = 1;
		const nextTopic = await prisma.topic.findFirst({
			where: { packId: game.packId, order: nextTopicOrder },
			select: { id: true },
		});
		if (!nextTopic) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Next topic not found",
			});
		}
		nextTopicId = nextTopic.id;
	} else {
		nextTopicOrder = currentTopicOrder;
		nextQuestionOrder = currentQuestionOrder + 1;
		nextTopicId = gameTopic.topicId;
	}

	const nextQuestion = await prisma.question.findFirst({
		where: {
			topicId: nextTopicId,
			order: nextQuestionOrder,
		},
		select: {
			id: true,
			order: true,
			text: true,
			answer: true,
			acceptableAnswers: true,
			explanation: true,
		},
	});

	if (!nextQuestion) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Next question not found",
		});
	}

	const crossedTopicBoundary = isLastQuestionInTopic;

	let topicBadgeEvents: Awaited<ReturnType<typeof finalizeGameTopic>> = [];

	const result = await prisma.$transaction(async (tx) => {
		// 1. finalize leaving GameQuestion
		const leavingResult = await finalizeGameQuestion(tx, gameQuestion.id);
		const leavingWasSkipped = !leavingResult.wasAnswered;

		// 2. topic boundary: finalize + create new GameTopic
		let nextGameTopicId = gameTopic.id;
		if (crossedTopicBoundary) {
			topicBadgeEvents = await finalizeGameTopic(tx, gameTopic.id);

			const nextGameTopic = await tx.gameTopic.create({
				data: {
					gameId: game.id,
					topicId: nextTopicId,
					order: nextTopicOrder,
					startedAt: now,
				},
				select: { id: true },
			});
			nextGameTopicId = nextGameTopic.id;
		}

		// 3. create next GameQuestion
		await tx.gameQuestion.create({
			data: {
				gameTopicId: nextGameTopicId,
				questionId: nextQuestion.id,
				order: nextQuestionOrder,
				points: nextQuestionOrder * 100,
				status: "active",
				startedAt: now,
			},
		});

		// 4. advance Game pointers + bump totals
		await tx.game.update({
			where: { id: game.id },
			data: {
				currentTopicOrder: nextTopicOrder,
				currentQuestionOrder: nextQuestionOrder,
				isQuestionRevealed: false,
				totalQuestions: { increment: 1 },
				totalUnresolvedQuestions: leavingWasSkipped
					? { increment: 1 }
					: undefined,
				totalTopics: crossedTopicBoundary ? { increment: 1 } : undefined,
			},
		});

		return { leavingWasSkipped };
	});

	void result;

	if (topicBadgeEvents.length > 0) {
		await publishBadgeEarnedMany(input.code, topicBadgeEvents);
	}

	// Load next topic info for the public payload
	const nextTopicInfo = await prisma.topic.findUnique({
		where: { id: nextTopicId },
		select: {
			slug: true,
			name: true,
			order: true,
			description: true,
		},
	});

	const output: AdvanceQuestionOutputType = {
		currentTopicOrder: nextTopicOrder,
		currentQuestionOrder: nextQuestionOrder,
		isQuestionRevealed: false,
		currentTopic: nextTopicInfo,
		currentQuestionPublic: {
			order: nextQuestion.order,
			points: nextQuestion.order * 100,
		},
		hostCurrentQuestion: {
			order: nextQuestion.order,
			text: nextQuestion.text,
			answer: nextQuestion.answer,
			acceptableAnswers: nextQuestion.acceptableAnswers,
			explanation: nextQuestion.explanation,
		},
	};

	// Broadcast the redacted public payload to every subscriber.
	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.QUESTION_ADVANCED, {
		currentTopicOrder: output.currentTopicOrder,
		currentQuestionOrder: output.currentQuestionOrder,
		isQuestionRevealed: false,
		currentTopic: output.currentTopic,
		currentQuestionPublic: output.currentQuestionPublic,
		isAuthoritative: true,
	});

	return output;
}

/**
 * SKIP QUESTION
 *
 * Host abandons the current question entirely (no stats, no QDR). Deletes all
 * buzzes and the active GameQuestion row, then moves to the next question
 * without incrementing `totalQuestions`.
 */
export async function skipQuestion(
	input: SkipQuestionInputType,
	userId: string,
): Promise<AdvanceQuestionOutputType> {
	const { game, gameTopic, gameQuestion, question } = await loadHostGameContext(
		input.code,
		userId,
		{ allowPaused: true },
	);

	const currentQuestionOrder = game.currentQuestionOrder as number;
	const currentTopicOrder = game.currentTopicOrder as number;

	const inclusion = await resolveSessionTopicPackOrders(
		game.packId,
		game.includedTopicPackOrders,
	);
	const lastPackTopicOrder = inclusion[inclusion.length - 1];

	const isLastQuestionInTopic = currentQuestionOrder >= 5;
	const isLastTopicInPack =
		inclusion.length > 0 && currentTopicOrder === lastPackTopicOrder;

	if (isLastQuestionInTopic && isLastTopicInPack) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No more questions. Use 'Finish game' to complete the game.",
		});
	}

	const now = new Date();
	let nextTopicOrder: number;
	let nextQuestionOrder: number;
	let nextTopicId: string;

	if (isLastQuestionInTopic) {
		const idx = inclusion.indexOf(currentTopicOrder);
		if (idx < 0 || idx >= inclusion.length - 1) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Next topic not found in session",
			});
		}
		const nextInSession = inclusion[idx + 1];
		if (nextInSession === undefined) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Next topic not found in session",
			});
		}
		nextTopicOrder = nextInSession;
		nextQuestionOrder = 1;
		const nextTopic = await prisma.topic.findFirst({
			where: { packId: game.packId, order: nextTopicOrder },
			select: { id: true },
		});
		if (!nextTopic) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Next topic not found",
			});
		}
		nextTopicId = nextTopic.id;
	} else {
		nextTopicOrder = currentTopicOrder;
		nextQuestionOrder = currentQuestionOrder + 1;
		nextTopicId = gameTopic.topicId;
	}

	const nextQuestion = await prisma.question.findFirst({
		where: {
			topicId: nextTopicId,
			order: nextQuestionOrder,
		},
		select: {
			id: true,
			order: true,
			text: true,
			answer: true,
			acceptableAnswers: true,
			explanation: true,
		},
	});

	if (!nextQuestion) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Next question not found",
		});
	}

	const crossedTopicBoundary = isLastQuestionInTopic;

	const packRow = await prisma.pack.findUnique({
		where: { id: game.packId },
		select: { status: true },
	});

	let topicBadgeEvents: Awaited<ReturnType<typeof finalizeGameTopic>> = [];

	await prisma.$transaction(async (tx) => {
		await stripAllClicksForQuestionInTx(tx, {
			gameId: game.id,
			packId: game.packId,
			questionId: question.id,
			packStatus: packRow?.status ?? null,
		});

		await tx.gameQuestion.delete({
			where: { id: gameQuestion.id },
		});

		let nextGameTopicId = gameTopic.id;
		if (crossedTopicBoundary) {
			topicBadgeEvents = await finalizeGameTopic(tx, gameTopic.id);

			const nextGameTopic = await tx.gameTopic.create({
				data: {
					gameId: game.id,
					topicId: nextTopicId,
					order: nextTopicOrder,
					startedAt: now,
				},
				select: { id: true },
			});
			nextGameTopicId = nextGameTopic.id;
		}

		await tx.gameQuestion.create({
			data: {
				gameTopicId: nextGameTopicId,
				questionId: nextQuestion.id,
				order: nextQuestionOrder,
				points: nextQuestionOrder * 100,
				status: "active",
				startedAt: now,
			},
		});

		await tx.game.update({
			where: { id: game.id },
			data: {
				currentTopicOrder: nextTopicOrder,
				currentQuestionOrder: nextQuestionOrder,
				isQuestionRevealed: false,
				totalHostSkippedQuestions: { increment: 1 },
				totalTopics: crossedTopicBoundary ? { increment: 1 } : undefined,
			},
		});
	});

	if (topicBadgeEvents.length > 0) {
		await publishBadgeEarnedMany(input.code, topicBadgeEvents);
	}

	const nextTopicInfo = await prisma.topic.findUnique({
		where: { id: nextTopicId },
		select: {
			slug: true,
			name: true,
			order: true,
			description: true,
		},
	});

	const output: AdvanceQuestionOutputType = {
		currentTopicOrder: nextTopicOrder,
		currentQuestionOrder: nextQuestionOrder,
		isQuestionRevealed: false,
		currentTopic: nextTopicInfo,
		currentQuestionPublic: {
			order: nextQuestion.order,
			points: nextQuestion.order * 100,
		},
		hostCurrentQuestion: {
			order: nextQuestion.order,
			text: nextQuestion.text,
			answer: nextQuestion.answer,
			acceptableAnswers: nextQuestion.acceptableAnswers,
			explanation: nextQuestion.explanation,
		},
	};

	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.QUESTION_SKIPPED, {
		currentTopicOrder: output.currentTopicOrder,
		currentQuestionOrder: output.currentQuestionOrder,
		isQuestionRevealed: false,
		currentTopic: output.currentTopic,
		currentQuestionPublic: output.currentQuestionPublic,
		hostCurrentQuestion: output.hostCurrentQuestion,
		skippedQuestionId: question.id,
		skippedTopicId: gameTopic.topicId,
		isAuthoritative: true,
	});

	return output;
}

/**
 * COMPLETE GAME
 *
 * Host-confirmed finish. Only valid on the last question of the last topic
 * once it's been revealed. Finalizes the trailing question + topic, computes
 * every player's final stats + rank, sets the game's winner, duration, and
 * totals, bumps pack plays, then broadcasts GAME_ENDED.
 */
export async function completeGame(
	input: CompleteGameInputType,
	userId: string,
): Promise<CompleteGameOutputType> {
	const { game } = await loadHostGameContext(input.code, userId);

	if (!game.isQuestionRevealed) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Reveal the last question before finishing the game",
		});
	}

	const currentQuestionOrder = game.currentQuestionOrder as number;
	const currentTopicOrder = game.currentTopicOrder as number;

	const inclusion = await resolveSessionTopicPackOrders(
		game.packId,
		game.includedTopicPackOrders,
	);
	const lastPackTopicOrder = inclusion[inclusion.length - 1];

	if (
		currentQuestionOrder < 5 ||
		currentTopicOrder !== lastPackTopicOrder ||
		lastPackTopicOrder === undefined
	) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Can only finish the game on the last question",
		});
	}

	const now = new Date();

	const finalResult = await prisma.$transaction(
		async (tx) => finalizeGame(tx, game.id, { now }),
		FINALIZE_GAME_INTERACTIVE_TRANSACTION_OPTIONS,
	);

	if (finalResult.badgeEvents.length > 0) {
		await publishBadgeEarnedMany(input.code, finalResult.badgeEvents);
	}

	// broadcast
	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.GAME_ENDED, {
		finishedAt: finalResult.finishedAt,
		winnerId: finalResult.winnerId,
		playerRanks: finalResult.playerRanks,
		isAuthoritative: true,
	});

	scheduleGameWinnerEmailIfNeeded(game.id, finalResult);

	return {
		status: "completed",
		finishedAt: finalResult.finishedAt,
		winnerId: finalResult.winnerId,
		playerRanks: finalResult.playerRanks,
	};
}

/**
 * LEAVE AS HOST
 *
 * Host ends the game themselves, mid-progress or not. Calls finalizeGame with
 * `force: true` so the trailing (unrevealed) question is marked skipped, then
 * rolls up stats and broadcasts GAME_ENDED.
 */
const HOST_DISCONNECT_GRACE_MS = 10_000;

/**
 * HANDLE HOST DISCONNECT
 *
 * Fired by any player client that observes the host leave Ably presence.
 * Verifies participation, waits out a short grace window (so a host refresh
 * or brief network blip doesn't auto-finalize the game), then re-checks
 * Ably presence. If the host is still absent and the game is still active,
 * we finalize via `finalizeGame({ force: true })` and broadcast GAME_ENDED.
 *
 * Idempotent: if the game has already ended or the host reappears, it's a
 * no-op.
 */
export async function handleHostDisconnect(
	input: HandleHostDisconnectInputType,
	userId: string,
): Promise<HandleHostDisconnectOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			hostId: true,
			status: true,
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", { message: "Game not found" });
	}

	if (game.status !== "active") {
		return { status: game.status, finalized: false };
	}

	if (userId === game.hostId) {
		return { status: "active", finalized: false };
	}

	const caller = await prisma.player.findUnique({
		where: { userId_gameId: { userId, gameId: game.id } },
		select: { id: true, status: true },
	});

	if (!caller) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only participants can report host disconnect",
		});
	}

	const channel = ablyRest.channels.get(channels.game(input.code));

	await new Promise((resolve) => setTimeout(resolve, HOST_DISCONNECT_GRACE_MS));

	let presenceMembers: { clientId?: string | null }[] = [];
	try {
		const page = await channel.presence.get();
		presenceMembers = page.items;
	} catch {
		return { status: "active", finalized: false };
	}

	const hostPresent = presenceMembers.some((m) => m.clientId === game.hostId);
	if (hostPresent) {
		return { status: "active", finalized: false };
	}

	const fresh = await prisma.game.findUnique({
		where: { id: game.id },
		select: { id: true, status: true },
	});
	if (!fresh || fresh.status !== "active") {
		return {
			status: fresh?.status ?? "aborted",
			finalized: false,
		};
	}

	const finalResult = await prisma.$transaction(
		async (tx) => finalizeGame(tx, game.id, { force: true }),
		FINALIZE_GAME_INTERACTIVE_TRANSACTION_OPTIONS,
	);

	if (!finalResult.wasAlreadyCompleted) {
		if (finalResult.badgeEvents.length > 0) {
			await publishBadgeEarnedMany(input.code, finalResult.badgeEvents);
		}
		await channel.publish(GAME_EVENTS.GAME_ENDED, {
			finishedAt: finalResult.finishedAt,
			winnerId: finalResult.winnerId,
			playerRanks: finalResult.playerRanks,
			isAuthoritative: true,
		});
		scheduleGameWinnerEmailIfNeeded(game.id, finalResult);
	}

	return {
		status: "completed",
		finalized: !finalResult.wasAlreadyCompleted,
		winnerId: finalResult.winnerId,
		finishedAt: finalResult.finishedAt,
	};
}

export async function leaveAsHost(
	input: LeaveAsHostInputType,
	userId: string,
): Promise<LeaveAsHostOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: { id: true, hostId: true, status: true, startedAt: true },
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", { message: "Game not found" });
	}

	if (game.hostId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the host can end this game",
		});
	}

	if (game.status === "completed") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Game has already ended",
		});
	}

	const now = new Date();

	const finalResult = await prisma.$transaction(async (tx) => {
		if (!game.startedAt) {
			return completeLobbyOnlyGame(tx, game.id, now);
		}
		return finalizeGame(tx, game.id, { now, force: true });
	}, FINALIZE_GAME_INTERACTIVE_TRANSACTION_OPTIONS);

	if (finalResult.badgeEvents.length > 0) {
		await publishBadgeEarnedMany(input.code, finalResult.badgeEvents);
	}

	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.GAME_ENDED, {
		finishedAt: finalResult.finishedAt,
		winnerId: finalResult.winnerId,
		playerRanks: finalResult.playerRanks,
		isAuthoritative: true,
	});

	if (game.startedAt) {
		scheduleGameWinnerEmailIfNeeded(game.id, finalResult);
	}

	return {
		status: "completed",
		finishedAt: finalResult.finishedAt,
		winnerId: finalResult.winnerId,
		playerRanks: finalResult.playerRanks,
	};
}
