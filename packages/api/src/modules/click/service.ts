// packages/api/src/modules/click/service.ts
import { ORPCError } from "@orpc/server";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { ablyRest } from "@xamsa/ably/server";
import prisma from "@xamsa/db";
import type {
	ClickBuzzInputType,
	ClickBuzzOutputType,
	ClickResolveInputType,
	ClickResolveOutputType,
} from "@xamsa/schemas/modules/click";
import {
	computeQdrSkipUpdate,
	computeQdrUpdate,
	MIN_ELO_FOR_SKIP_SIGNAL,
	normalizeToQdr,
	recomputePdr,
	recomputeTdr,
} from "@xamsa/utils/difficulty-rate";
import { maybeAwardScavenger } from "../badge/scavenger";
import { tryPublishTopicBadgesForCompletedCurrentTopic } from "../badge/topic-badges";
import {
	duplicateBuzzBlockedForUser,
	userIdsWhoSawQuestionInPriorCompletedGames,
} from "../game/duplicate-question-policy";

export async function buzzClick(
	input: ClickBuzzInputType,
	userId: string,
): Promise<ClickBuzzOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			status: true,
			packId: true,
			startedAt: true,
			currentTopicOrder: true,
			currentQuestionOrder: true,
			isQuestionRevealed: true,
			settings: {
				select: {
					duplicateQuestionPolicy: true,
				},
			},
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", {
			message: "Game not found",
		});
	}

	if (game.isQuestionRevealed) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Question is already revealed; buzzer is closed",
		});
	}

	if (game.status !== "active") {
		throw new ORPCError("BAD_REQUEST", {
			message:
				game.status === "paused" ? "Game is paused" : "Game is not active",
		});
	}

	if (game.currentTopicOrder === null || game.currentQuestionOrder === null) {
		throw new ORPCError("BAD_REQUEST", {
			message: "No active question",
		});
	}

	// find the player
	const player = await prisma.player.findUnique({
		where: {
			userId_gameId: {
				userId,
				gameId: game.id,
			},
		},
		select: {
			id: true,
			status: true,
		},
	});

	if (!player || player.status !== "playing") {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not an active player in this game",
		});
	}

	// find the current question
	const currentQuestion = await prisma.question.findFirst({
		where: {
			order: game.currentQuestionOrder,
			topic: {
				packId: game.packId,
				order: game.currentTopicOrder,
			},
		},
		select: {
			id: true,
			topicId: true,
		},
	});

	if (!currentQuestion) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Current question not found",
		});
	}

	// check if player already has a click on this question
	const existingClick = await prisma.click.findUnique({
		where: {
			playerId_gameId_questionId: {
				playerId: player.id,
				gameId: game.id,
				questionId: currentQuestion.id,
			},
		},
		select: {
			id: true,
			status: true,
		},
	});

	if (existingClick) {
		if (existingClick.status === "wrong") {
			throw new ORPCError("BAD_REQUEST", {
				message: "You already answered wrong on this question",
			});
		}
		throw new ORPCError("BAD_REQUEST", {
			message: "You already buzzed on this question",
		});
	}

	const duplicatePolicy = game.settings?.duplicateQuestionPolicy ?? "none";
	if (duplicatePolicy !== "none") {
		const playingPlayers = await prisma.player.findMany({
			where: { gameId: game.id, status: "playing" },
			select: { userId: true },
		});
		const playingUserIds = playingPlayers.map((p) => p.userId);
		const candidateUserIds =
			duplicatePolicy === "block_individuals" ? [userId] : playingUserIds;
		const sawBefore = await userIdsWhoSawQuestionInPriorCompletedGames(prisma, {
			packId: game.packId,
			questionId: currentQuestion.id,
			excludeGameId: game.id,
			candidateUserIds,
		});
		const { blocked } = duplicateBuzzBlockedForUser({
			policy: duplicatePolicy,
			currentUserId: userId,
			sawBefore,
		});
		if (blocked) {
			throw new ORPCError("FORBIDDEN", {
				message:
					duplicatePolicy === "block_individuals"
						? "You already played this question in a finished game with this pack."
						: "Someone in this room already played this question in a finished game with this pack.",
			});
		}
	}

	// count existing clicks for position
	const existingClickCount = await prisma.click.count({
		where: {
			gameId: game.id,
			questionId: currentQuestion.id,
		},
	});

	const clickedAt = new Date();

	// create the click
	const click = await prisma.click.create({
		data: {
			playerId: player.id,
			gameId: game.id,
			topicId: currentQuestion.topicId,
			questionId: currentQuestion.id,
			position: existingClickCount + 1,
			clickedAt,
			status: "pending",
		},
		select: {
			id: true,
			position: true,
			clickedAt: true,
			status: true,
		},
	});

	// broadcast to channel
	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.CLICK_NEW, {
		intentId: input.intentId,
		clickId: click.id,
		playerId: player.id,
		position: click.position,
		status: click.status,
		clickedAt: click.clickedAt,
	});

	return click;
}

const PLAYER_STATS_SELECT = {
	id: true,
	score: true,
	correctAnswers: true,
	incorrectAnswers: true,
	expiredClicks: true,
	currentCorrectStreak: true,
	currentWrongStreak: true,
	longestCorrectStreak: true,
	longestWrongStreak: true,
	peakScore: true,
	lowestScore: true,
} as const;

type PlayerStats = {
	id: string;
	score: number;
	correctAnswers: number;
	incorrectAnswers: number;
	expiredClicks: number;
	currentCorrectStreak: number;
	currentWrongStreak: number;
	longestCorrectStreak: number;
	longestWrongStreak: number;
	peakScore: number;
	lowestScore: number;
};

export async function resolveClick(
	input: ClickResolveInputType,
	userId: string,
): Promise<ClickResolveOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			hostId: true,
			status: true,
			packId: true,
			pack: { select: { id: true, status: true } },
			currentTopicOrder: true,
			currentQuestionOrder: true,
			isQuestionRevealed: true,
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", { message: "Game not found" });
	}

	if (game.hostId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the host can resolve clicks",
		});
	}

	if (game.isQuestionRevealed) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Question is already revealed",
		});
	}

	if (game.status !== "active") {
		throw new ORPCError("BAD_REQUEST", {
			message:
				game.status === "paused" ? "Game is paused" : "Game is not active",
		});
	}

	if (game.currentTopicOrder === null || game.currentQuestionOrder === null) {
		throw new ORPCError("BAD_REQUEST", { message: "No active question" });
	}

	// resolve current question id for sanity check (+text/answer for reveal broadcast)
	const currentQuestion = await prisma.question.findFirst({
		where: {
			order: game.currentQuestionOrder,
			topic: {
				packId: game.packId,
				order: game.currentTopicOrder,
			},
		},
		select: {
			id: true,
			order: true,
			text: true,
			answer: true,
			explanation: true,
			acceptableAnswers: true,
			topicId: true,
			qdr: true,
			qdrEloEquiv: true,
			qdrScoredAttempts: true,
		},
	});

	if (!currentQuestion) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Current question not found",
		});
	}

	// load the target click + its player
	const click = await prisma.click.findUnique({
		where: { id: input.clickId },
		select: {
			id: true,
			status: true,
			gameId: true,
			questionId: true,
			playerId: true,
		},
	});

	if (!click) {
		throw new ORPCError("NOT_FOUND", { message: "Click not found" });
	}

	if (click.gameId !== game.id || click.questionId !== currentQuestion.id) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Click does not belong to the current question",
		});
	}

	if (click.status !== "pending") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Click has already been resolved",
		});
	}

	const points = currentQuestion.order * 100;
	const pointsAwarded = input.resolution === "correct" ? points : -points;
	const now = new Date();

	const result = await prisma.$transaction(async (tx) => {
		// 1. update click with optimistic concurrency (status=pending guard)
		const updatedClickBatch = await tx.click.updateMany({
			where: { id: click.id, status: "pending" },
			data: {
				status: input.resolution,
				answeredAt: now,
				pointsAwarded,
			},
		});

		if (updatedClickBatch.count === 0) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Click has already been resolved",
			});
		}

		// 2. update resolving player's stats
		const player = await tx.player.findUnique({
			where: { id: click.playerId },
			select: { ...PLAYER_STATS_SELECT, eloAtGameStart: true },
		});

		if (!player) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Player not found",
			});
		}

		const newScore = player.score + pointsAwarded;
		const isCorrect = input.resolution === "correct";

		const nextCorrectStreak = isCorrect ? player.currentCorrectStreak + 1 : 0;
		const nextWrongStreak = isCorrect ? 0 : player.currentWrongStreak + 1;

		const updatedResolver = await tx.player.update({
			where: { id: player.id },
			data: {
				score: newScore,
				peakScore: Math.max(player.peakScore, newScore),
				lowestScore: Math.min(player.lowestScore, newScore),
				correctAnswers: isCorrect
					? player.correctAnswers + 1
					: player.correctAnswers,
				incorrectAnswers: isCorrect
					? player.incorrectAnswers
					: player.incorrectAnswers + 1,
				currentCorrectStreak: nextCorrectStreak,
				currentWrongStreak: nextWrongStreak,
				longestCorrectStreak: Math.max(
					player.longestCorrectStreak,
					nextCorrectStreak,
				),
				longestWrongStreak: Math.max(
					player.longestWrongStreak,
					nextWrongStreak,
				),
			},
			select: PLAYER_STATS_SELECT,
		});

		// 2b. QDR / TDR / PDR — published or draft (author playtests); skip archived only.
		if (game.pack.status !== "archived") {
			const qRow = await tx.question.findUnique({
				where: { id: currentQuestion.id },
				select: {
					qdrEloEquiv: true,
					qdrScoredAttempts: true,
					topicId: true,
				},
			});
			if (qRow) {
				const outcome: 0 | 1 = isCorrect ? 1 : 0;
				const eloBefore = qRow.qdrEloEquiv;
				const qUp = computeQdrUpdate({
					qdrEloEquiv: qRow.qdrEloEquiv,
					qdrScoredAttempts: qRow.qdrScoredAttempts,
					userEloAtGameStart: player.eloAtGameStart,
					outcome,
				});
				const qdrEloEquivDelta = qUp.qdrEloEquiv - eloBefore;
				await tx.question.update({
					where: { id: currentQuestion.id },
					data: {
						qdrEloEquiv: qUp.qdrEloEquiv,
						qdrScoredAttempts: qUp.qdrScoredAttempts,
						qdr: qUp.qdr,
						qdrUpdatedAt: now,
					},
				});
				await tx.click.update({
					where: { id: click.id },
					data: { qdrEloEquivDelta },
				});
				const topicQuestions = await tx.question.findMany({
					where: { topicId: qRow.topicId },
					select: { qdr: true, qdrScoredAttempts: true },
				});
				const newTdr = recomputeTdr(
					topicQuestions.map((q) => q.qdr),
					topicQuestions.map((q) => q.qdrScoredAttempts),
				);
				await tx.topic.update({
					where: { id: qRow.topicId },
					data: { tdr: newTdr, tdrUpdatedAt: now },
				});
				const packTopics = await tx.topic.findMany({
					where: { packId: game.packId },
					select: { tdr: true },
				});
				const newPdr = recomputePdr(packTopics.map((t) => t.tdr));
				await tx.pack.update({
					where: { id: game.packId },
					data: { pdr: newPdr, pdrUpdatedAt: now },
				});
			}
		}

		// 3. cascade: on correct answer, expire every other pending click
		const expiredPlayerUpdates: PlayerStats[] = [];
		const expiredClickIds: { id: string; playerId: string }[] = [];

		if (isCorrect) {
			const pendingRemaining = await tx.click.findMany({
				where: {
					gameId: game.id,
					questionId: currentQuestion.id,
					status: "pending",
				},
				select: { id: true, playerId: true },
			});

			if (pendingRemaining.length > 0) {
				await tx.click.updateMany({
					where: {
						id: { in: pendingRemaining.map((c) => c.id) },
					},
					data: {
						status: "expired",
						answeredAt: now,
						pointsAwarded: 0,
					},
				});

				for (const expired of pendingRemaining) {
					const refreshed = await tx.player.update({
						where: { id: expired.playerId },
						data: { expiredClicks: { increment: 1 } },
						select: PLAYER_STATS_SELECT,
					});
					expiredPlayerUpdates.push(refreshed);
					expiredClickIds.push({
						id: expired.id,
						playerId: expired.playerId,
					});
				}
			}
		}

		// 4. compute whether the question should auto-reveal
		//    - correct: always reveal
		//    - wrong: reveal only when the queue is exhausted (no pending left
		//      and every active player already has a non-pending click)
		let shouldReveal = isCorrect;
		if (!isCorrect) {
			const [activePlayerCount, pendingLeft, resolvedCount] = await Promise.all(
				[
					tx.player.count({
						where: { gameId: game.id, status: "playing" },
					}),
					tx.click.count({
						where: {
							gameId: game.id,
							questionId: currentQuestion.id,
							status: "pending",
						},
					}),
					tx.click.count({
						where: {
							gameId: game.id,
							questionId: currentQuestion.id,
							status: { not: "pending" },
						},
					}),
				],
			);
			shouldReveal = pendingLeft === 0 && resolvedCount >= activePlayerCount;
		}

		const willFlipReveal = shouldReveal && !game.isQuestionRevealed;

		// 4b. Non-click QDR signal — when the question closes, every active
		//     high-Elo player who never produced a Click row contributes a small
		//     "skip" signal nudging the question harder. This catches cases where
		//     strong players sat the question out because it looked obscure.
		if (willFlipReveal && game.pack.status !== "archived") {
			const [qSnapshot, allClickerIds, candidateNonClickers] =
				await Promise.all([
					tx.question.findUnique({
						where: { id: currentQuestion.id },
						select: { qdrEloEquiv: true, topicId: true },
					}),
					tx.click.findMany({
						where: {
							gameId: game.id,
							questionId: currentQuestion.id,
						},
						select: { playerId: true },
					}),
					tx.player.findMany({
						where: {
							gameId: game.id,
							status: "playing",
							eloAtGameStart: { gte: MIN_ELO_FOR_SKIP_SIGNAL },
						},
						select: { id: true, eloAtGameStart: true },
					}),
				]);

			if (qSnapshot && candidateNonClickers.length > 0) {
				const clickerIds = new Set(allClickerIds.map((c) => c.playerId));
				const skippers = candidateNonClickers.filter(
					(p) => !clickerIds.has(p.id),
				);

				if (skippers.length > 0) {
					let runningEloEquiv = qSnapshot.qdrEloEquiv;
					for (const s of skippers) {
						const next = computeQdrSkipUpdate({
							qdrEloEquiv: runningEloEquiv,
							qdrScoredAttempts: 0,
							userEloAtGameStart: s.eloAtGameStart,
						});
						runningEloEquiv = next.qdrEloEquiv;
					}
					if (runningEloEquiv !== qSnapshot.qdrEloEquiv) {
						await tx.question.update({
							where: { id: currentQuestion.id },
							data: {
								qdrEloEquiv: runningEloEquiv,
								qdr: normalizeToQdr(runningEloEquiv),
								qdrUpdatedAt: now,
							},
						});
						// Re-roll TDR/PDR after the skip nudge.
						const topicQuestions = await tx.question.findMany({
							where: { topicId: qSnapshot.topicId },
							select: { qdr: true, qdrScoredAttempts: true },
						});
						const newTdr = recomputeTdr(
							topicQuestions.map((q) => q.qdr),
							topicQuestions.map((q) => q.qdrScoredAttempts),
						);
						await tx.topic.update({
							where: { id: qSnapshot.topicId },
							data: { tdr: newTdr, tdrUpdatedAt: now },
						});
						const packTopics = await tx.topic.findMany({
							where: { packId: game.packId },
							select: { tdr: true },
						});
						const newPdr = recomputePdr(packTopics.map((t) => t.tdr));
						await tx.pack.update({
							where: { id: game.packId },
							data: { pdr: newPdr, pdrUpdatedAt: now },
						});
					}
				}
			}
		}

		// 5. update game totals (+ optional reveal flip)
		const expiredCount = expiredClickIds.length;
		await tx.game.update({
			where: { id: game.id },
			data: {
				totalAnswers: { increment: 1 + expiredCount },
				totalCorrectAnswers: isCorrect ? { increment: 1 } : undefined,
				totalIncorrectAnswers: isCorrect ? undefined : { increment: 1 },
				totalExpiredAnswers:
					expiredCount > 0 ? { increment: expiredCount } : undefined,
				totalPointsAwarded:
					pointsAwarded > 0 ? { increment: pointsAwarded } : undefined,
				totalPointsDeducted:
					pointsAwarded < 0 ? { increment: -pointsAwarded } : undefined,
				isQuestionRevealed: willFlipReveal ? true : undefined,
			},
		});

		return {
			resolver: updatedResolver,
			expiredPlayerUpdates,
			expiredClickIds,
			shouldReveal,
		};
	});

	// Broadcast + badge work in parallel after commit so the room sees click
	// state and celebration without waiting for each serial await.
	const affectedPlayers: PlayerStats[] = [
		result.resolver,
		...result.expiredPlayerUpdates,
	];

	const channel = ablyRest.channels.get(channels.game(input.code));
	const clickResolvedPublish = channel.publish(GAME_EVENTS.CLICK_RESOLVED, {
		resolution: input.resolution,
		click: {
			id: click.id,
			playerId: click.playerId,
			status: input.resolution,
			pointsAwarded,
			answeredAt: now.toISOString(),
		},
		expiredClicks: result.expiredClickIds,
		playerScores: affectedPlayers.map((p) => ({
			playerId: p.id,
			score: p.score,
			correctAnswers: p.correctAnswers,
			incorrectAnswers: p.incorrectAnswers,
			expiredClicks: p.expiredClicks,
			currentCorrectStreak: p.currentCorrectStreak,
			currentWrongStreak: p.currentWrongStreak,
			longestCorrectStreak: p.longestCorrectStreak,
			longestWrongStreak: p.longestWrongStreak,
			peakScore: p.peakScore,
			lowestScore: p.lowestScore,
		})),
		questionReveal: result.shouldReveal
			? {
					order: currentQuestion.order,
					text: currentQuestion.text,
					answer: currentQuestion.answer,
					explanation: currentQuestion.explanation,
					acceptableAnswers: currentQuestion.acceptableAnswers,
				}
			: null,
		isAuthoritative: true,
	});

	const scavengerPublish =
		input.resolution === "correct" && game.currentTopicOrder != null
			? maybeAwardScavenger({
					code: input.code,
					gameId: game.id,
					currentTopicOrder: game.currentTopicOrder,
					questionId: currentQuestion.id,
					resolvingPlayerId: click.playerId,
				})
			: Promise.resolve();

	// Topic badges (ace, ghost, jackpot, …) when the last question in the topic
	// is revealed; batch publish + parallel with click keeps latency low.
	const topicBadgesPublish =
		result.shouldReveal &&
		game.currentTopicOrder != null &&
		game.currentQuestionOrder != null
			? tryPublishTopicBadgesForCompletedCurrentTopic(input.code, {
					gameId: game.id,
					currentTopicOrder: game.currentTopicOrder,
					currentQuestionOrder: game.currentQuestionOrder,
				})
			: Promise.resolve();

	await Promise.all([
		clickResolvedPublish,
		scavengerPublish,
		topicBadgesPublish,
	]);

	return {
		id: click.id,
		status: input.resolution,
		pointsAwarded,
		answeredAt: now,
	};
}
