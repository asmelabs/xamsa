import { ORPCError } from "@orpc/server";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { ablyRest } from "@xamsa/ably/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	PlayerJoinInputType,
	PlayerJoinOutputType,
	PlayerKickInputType,
	PlayerKickOutputType,
	PlayerLeaveInputType,
	PlayerLeaveOutputType,
} from "@xamsa/schemas/modules/player";
import { MAX_PLAYERS_PER_GAME } from "@xamsa/utils/constants";
import { publishBadgeEarnedMany } from "../badge/publish";
import { finalizeGame } from "../game/finalize-game";
import { scheduleGameWinnerEmailIfNeeded } from "../game/notify-game-winner-email";

export async function joinPlayer(
	input: PlayerJoinInputType,
	userId: string,
): Promise<PlayerJoinOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			status: true,
			hostId: true,
			_count: {
				select: {
					players: {
						where: {
							status: "playing",
						},
					},
				},
			},
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", {
			message: `Game with code "${input.code}" not found`,
		});
	}

	if (game.hostId === userId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You are the host of this game. You cannot join as a player.",
		});
	}

	if (game.status === "completed") {
		throw new ORPCError("BAD_REQUEST", {
			message: "This game has already ended",
		});
	}

	if (game.status === "paused") {
		throw new ORPCError("BAD_REQUEST", {
			message: "This game is paused. Please wait for the host to resume it.",
		});
	}

	if (game._count.players >= MAX_PLAYERS_PER_GAME) {
		throw new ORPCError("FORBIDDEN", {
			message: "This game is full",
		});
	}

	const userEloForSnapshot = await prisma.user.findUnique({
		where: { id: userId },
		select: { elo: true },
	});
	const snapshotEloOnJoin =
		game.status === "active" && userEloForSnapshot
			? userEloForSnapshot.elo
			: null;

	const existingPlayer = await prisma.player.findUnique({
		where: {
			userId_gameId: {
				userId,
				gameId: game.id,
			},
		},
		select: {
			id: true,
			status: true,
			leaveReason: true,
		},
	});

	const broadcastJoin = async (playerId: string) => {
		const fullPlayer = await prisma.player.findUnique({
			where: { id: playerId },
			select: {
				id: true,
				score: true,
				rank: true,
				status: true,
				joinedAt: true,
				leftAt: true,
				user: {
					select: {
						username: true,
						name: true,
						image: true,
					},
				},
			},
		});

		const channel = ablyRest.channels.get(channels.game(input.code));
		await channel.publish(GAME_EVENTS.PLAYER_JOINED, { player: fullPlayer });
	};

	if (existingPlayer) {
		// kicked players cannot rejoin
		if (existingPlayer.leaveReason === "kicked") {
			throw new ORPCError("FORBIDDEN", {
				message: "You have been kicked from this game",
			});
		}

		// already active — no-op, return existing record
		if (existingPlayer.status === "playing") {
			const player = await prisma.player.findUnique({
				where: { id: existingPlayer.id },
				select: {
					id: true,
					status: true,
					joinedAt: true,
				},
			});

			if (!player) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to retrieve existing player",
				});
			}

			return player;
		}

		// rejoining — reactivate the existing player record
		const reactivated = await prisma.player.update({
			where: { id: existingPlayer.id },
			data: {
				status: "playing",
				leftAt: null,
				leaveReason: null,
				...(snapshotEloOnJoin != null
					? { eloAtGameStart: snapshotEloOnJoin }
					: {}),
			},
			select: {
				id: true,
				status: true,
				joinedAt: true,
			},
		});

		await prisma.game.update({
			where: { id: game.id },
			data: { totalActivePlayers: { increment: 1 } },
		});

		await broadcastJoin(reactivated.id);
		return reactivated;
	}

	const player = await prisma.player.create({
		data: {
			userId,
			gameId: game.id,
			status: "playing",
			startedAt: new Date(),
			eloAtGameStart: snapshotEloOnJoin ?? undefined,
		},
		select: {
			id: true,
			status: true,
			joinedAt: true,
		},
	});

	await prisma.game.update({
		where: { id: game.id },
		data: { totalActivePlayers: { increment: 1 } },
	});

	await broadcastJoin(player.id);
	return player;
}

/**
 * Shared side-effect for both voluntary leave and host kick:
 *   - Flip any in-flight `pending` click the leaver has on the game's current
 *     question to `expired` and bump their expiredClicks counter.
 *
 * Returns the expired click id (if any) so the caller can surface it to
 * subscribers for optimistic UI updates.
 */
async function expireLeaverPendingClick(
	tx: Prisma.TransactionClient,
	gameId: string,
	playerId: string,
): Promise<string | null> {
	const game = await tx.game.findUnique({
		where: { id: gameId },
		select: {
			id: true,
			status: true,
			packId: true,
			currentTopicOrder: true,
			currentQuestionOrder: true,
		},
	});

	if (
		!game ||
		game.status !== "active" ||
		game.currentTopicOrder === null ||
		game.currentQuestionOrder === null
	) {
		return null;
	}

	const currentQuestion = await tx.question.findFirst({
		where: {
			order: game.currentQuestionOrder,
			topic: {
				packId: game.packId,
				order: game.currentTopicOrder,
			},
		},
		select: { id: true },
	});

	if (!currentQuestion) return null;

	const pendingClick = await tx.click.findFirst({
		where: {
			gameId,
			playerId,
			questionId: currentQuestion.id,
			status: "pending",
		},
		select: { id: true },
	});

	if (!pendingClick) return null;

	const now = new Date();
	await tx.click.update({
		where: { id: pendingClick.id },
		data: {
			status: "expired",
			answeredAt: now,
			pointsAwarded: 0,
		},
	});

	await tx.player.update({
		where: { id: playerId },
		data: { expiredClicks: { increment: 1 } },
	});

	return pendingClick.id;
}

export async function leavePlayer(
	input: PlayerLeaveInputType,
	userId: string,
): Promise<PlayerLeaveOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			hostId: true,
			status: true,
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", {
			message: `Game with code "${input.code}" not found`,
		});
	}

	if (game.hostId === userId) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Hosts cannot leave as a player. End the game instead.",
		});
	}

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

	if (!player) {
		throw new ORPCError("NOT_FOUND", {
			message: "You are not a player in this game",
		});
	}

	if (player.status === "left") {
		throw new ORPCError("BAD_REQUEST", {
			message: "You have already left this game",
		});
	}

	const { updated, expiredClickId, triggeredFinalize } =
		await prisma.$transaction(async (tx) => {
			const expiredId = await expireLeaverPendingClick(tx, game.id, player.id);

			const updatedRow = await tx.player.update({
				where: { id: player.id },
				data: {
					status: "left",
					leftAt: new Date(),
					leaveReason: "voluntary",
				},
				select: {
					id: true,
					status: true,
					leftAt: true,
				},
			});

			await tx.game.update({
				where: { id: game.id },
				data: { totalActivePlayers: { decrement: 1 } },
			});

			// If the last active player just left a running game, auto-finalize.
			let finalizeResult: Awaited<ReturnType<typeof finalizeGame>> | null =
				null;
			if (game.status === "active") {
				const remaining = await tx.player.count({
					where: {
						gameId: game.id,
						status: "playing",
					},
				});
				if (remaining === 0) {
					finalizeResult = await finalizeGame(tx, game.id, {
						force: true,
					});
				}
			}

			return {
				updated: updatedRow,
				expiredClickId: expiredId,
				triggeredFinalize: finalizeResult,
			};
		});

	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.PLAYER_LEFT, {
		playerId: updated.id,
		reason: "voluntary",
		expiredClickId,
	});

	if (triggeredFinalize && !triggeredFinalize.wasAlreadyCompleted) {
		if (triggeredFinalize.badgeEvents.length > 0) {
			await publishBadgeEarnedMany(input.code, triggeredFinalize.badgeEvents);
		}
		await channel.publish(GAME_EVENTS.GAME_ENDED, {
			finishedAt: triggeredFinalize.finishedAt,
			winnerId: triggeredFinalize.winnerId,
			playerRanks: triggeredFinalize.playerRanks,
			isAuthoritative: true,
		});
		scheduleGameWinnerEmailIfNeeded(game.id, triggeredFinalize);
	}

	return updated;
}

/**
 * Kick — host kicks a player
 */
export async function kickPlayer(
	input: PlayerKickInputType,
	userId: string,
): Promise<PlayerKickOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			hostId: true,
			status: true,
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", {
			message: `Game with code "${input.code}" not found`,
		});
	}

	if (game.hostId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the host can kick players",
		});
	}

	if (game.status === "completed") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Cannot kick players from a completed game",
		});
	}

	const player = await prisma.player.findFirst({
		where: {
			id: input.playerId,
			gameId: game.id,
		},
		select: {
			id: true,
			status: true,
		},
	});

	if (!player) {
		throw new ORPCError("NOT_FOUND", {
			message: "Player not found in this game",
		});
	}

	if (player.status === "left") {
		throw new ORPCError("BAD_REQUEST", {
			message: "This player has already left the game",
		});
	}

	const { updated, expiredClickId } = await prisma.$transaction(async (tx) => {
		const expiredId = await expireLeaverPendingClick(tx, game.id, player.id);

		const updatedRow = await tx.player.update({
			where: { id: player.id },
			data: {
				status: "left",
				leftAt: new Date(),
				leaveReason: "kicked",
			},
			select: {
				id: true,
				status: true,
				leftAt: true,
			},
		});

		await tx.game.update({
			where: { id: game.id },
			data: { totalActivePlayers: { decrement: 1 } },
		});

		return { updated: updatedRow, expiredClickId: expiredId };
	});

	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.PLAYER_LEFT, {
		playerId: updated.id,
		reason: "kicked",
		expiredClickId,
	});

	return updated;
}
