import type { BadgeEarnedMessage } from "@xamsa/ably/channels";
import type { Prisma } from "@xamsa/db";
import { calculateEloDeltas } from "@xamsa/utils/elo";
import {
	compareStandingsOrder,
	competitionRanksFromSorted,
} from "@xamsa/utils/game-standings";
import {
	computeLevelFromXp,
	HOST_FULL_GAME_COMPLETION_XP_BONUS,
} from "@xamsa/utils/progression";
import { createPlayerBadgeAward } from "../badge/service";
import { finalizeGameQuestion, finalizeGameTopic } from "./finalize";

export type FinalizeGameResult = {
	gameId: string;
	wasAlreadyCompleted: boolean;
	winnerId: string | null;
	finishedAt: Date;
	durationSeconds: number;
	playerRanks: { id: string; rank: number; score: number }[];
	/** Topic / question badges issued while finalizing the last open topic (for Ably after commit). */
	badgeEvents: BadgeEarnedMessage[];
};

export type FinalizeGameOptions = {
	/**
	 * When true, bypass position guards and finalize the trailing question as
	 * skipped if it wasn't revealed. Used for host abandonment / last-player
	 * leave flows where the game ends mid-progress.
	 */
	force?: boolean;
	/**
	 * Optional override timestamp. Defaults to `new Date()`. Useful for tests
	 * and for keeping timestamps consistent across a caller's transaction.
	 */
	now?: Date;
};

/**
 * Prisma interactive transactions default to a 5s timeout; {@link finalizeGame}
 * runs many queries (stats rollups, pack bump) and can exceed that on a cold DB
 * or busy games (P2028).
 */
export const FINALIZE_GAME_INTERACTIVE_TRANSACTION_OPTIONS = {
	maxWait: 15_000,
	timeout: 120_000,
} as const;

/**
 * FINALIZE GAME
 *
 * The single source of truth for closing out a game. Called by:
 *   - host-confirmed completeGame (at the very last question, revealed)
 *   - host abandonment (leaveAsHost / presence-based disconnect)
 *   - last active player leaves mid-game
 *
 * Responsibilities (all inside the caller's transaction):
 *   1. Idempotent: no-op if the game is already completed.
 *   2. Finalize the trailing GameQuestion + GameTopic (if present).
 *      - If force-finalizing an unrevealed question, mark it as skipped.
 *   3. Compute every player's aggregate stats and final rank.
 *   4. Persist ranks + per-player click stats.
 *   5. Roll up per-player aggregates onto the User row (Elo, play stats, etc. — not XP; XP is host-only).
 *   6. Roll up host stats (including hosting XP) onto the host User row.
 *   7. Update the Game row: status=completed, winner, duration, totals.
 *   8. Bump the Pack's totalPlays counter.
 *
 * If the game never left the lobby (`startedAt` is null), do not call this —
 * use `completeLobbyOnlyGame` instead. That path avoids all stat rollups.
 */
export async function completeLobbyOnlyGame(
	tx: Prisma.TransactionClient,
	gameId: string,
	now: Date = new Date(),
): Promise<FinalizeGameResult> {
	const game = await tx.game.findUnique({
		where: { id: gameId },
		select: {
			id: true,
			status: true,
			startedAt: true,
			finishedAt: true,
			winnerId: true,
		},
	});

	if (!game) {
		throw new Error(`Game ${gameId} not found`);
	}

	if (game.status === "completed") {
		const existingPlayers = await tx.player.findMany({
			where: { gameId },
			select: { id: true, rank: true, score: true },
			orderBy: [{ rank: "asc" }, { score: "desc" }],
		});
		return {
			gameId,
			wasAlreadyCompleted: true,
			winnerId: game.winnerId,
			finishedAt: game.finishedAt ?? now,
			durationSeconds: 0,
			playerRanks: existingPlayers.map((p) => ({
				id: p.id,
				rank: p.rank ?? 0,
				score: p.score,
			})),
			badgeEvents: [],
		};
	}

	if (game.startedAt != null) {
		throw new Error(
			"completeLobbyOnlyGame: game already started; use finalizeGame",
		);
	}

	const players = await tx.player.findMany({
		where: { gameId, status: { not: "left" } },
		select: { id: true, score: true },
		orderBy: { joinedAt: "asc" },
	});

	await tx.game.update({
		where: { id: gameId },
		data: {
			status: "completed",
			finishedAt: now,
			durationSeconds: 0,
			winnerId: null,
		},
	});

	return {
		gameId,
		wasAlreadyCompleted: false,
		winnerId: null,
		finishedAt: now,
		durationSeconds: 0,
		playerRanks: players.map((p, i) => ({
			id: p.id,
			rank: i + 1,
			score: p.score,
		})),
		badgeEvents: [],
	};
}

export async function finalizeGame(
	tx: Prisma.TransactionClient,
	gameId: string,
	options: FinalizeGameOptions = {},
): Promise<FinalizeGameResult> {
	const now = options.now ?? new Date();
	const force = options.force === true;

	const game = await tx.game.findUnique({
		where: { id: gameId },
		select: {
			id: true,
			hostId: true,
			packId: true,
			status: true,
			startedAt: true,
			finishedAt: true,
			winnerId: true,
			currentTopicOrder: true,
			currentQuestionOrder: true,
			isQuestionRevealed: true,
		},
	});

	if (!game) {
		throw new Error(`Game ${gameId} not found`);
	}

	// Idempotent: if already completed, just echo back ranks from the db.
	if (game.status === "completed") {
		const existingPlayers = await tx.player.findMany({
			where: { gameId },
			select: { id: true, rank: true, score: true },
			orderBy: [{ rank: "asc" }, { score: "desc" }],
		});
		return {
			gameId,
			wasAlreadyCompleted: true,
			winnerId: game.winnerId,
			finishedAt: game.finishedAt ?? now,
			durationSeconds: 0,
			playerRanks: existingPlayers.map((p) => ({
				id: p.id,
				rank: p.rank ?? 0,
				score: p.score,
			})),
			badgeEvents: [],
		};
	}

	if (!game.startedAt) {
		throw new Error(
			"finalizeGame: game never started; use completeLobbyOnlyGame for lobby-only cancels",
		);
	}

	// 1. Finalize trailing GameQuestion + GameTopic (if the game has started).
	let leavingWasSkipped = false;
	let topicWasClosed = false;
	let badgeEvents: BadgeEarnedMessage[] = [];

	if (game.currentTopicOrder !== null) {
		const trailingTopic = await tx.gameTopic.findUnique({
			where: {
				gameId_order: {
					gameId,
					order: game.currentTopicOrder,
				},
			},
			select: { id: true, finishedAt: true },
		});

		if (trailingTopic) {
			if (game.currentQuestionOrder !== null) {
				const trailingQuestion = await tx.gameQuestion.findUnique({
					where: {
						gameTopicId_order: {
							gameTopicId: trailingTopic.id,
							order: game.currentQuestionOrder,
						},
					},
					select: { id: true, finishedAt: true },
				});

				if (trailingQuestion && !trailingQuestion.finishedAt) {
					const result = await finalizeGameQuestion(tx, trailingQuestion.id, {
						markAsSkip: force && !game.isQuestionRevealed,
					});
					leavingWasSkipped = !result.wasAnswered;
				}
			}

			if (!trailingTopic.finishedAt) {
				badgeEvents = await finalizeGameTopic(tx, trailingTopic.id);
				topicWasClosed = true;
			}
		}
	}

	// 2. Gather every player + their clicks to compute game-level stats.
	const players = await tx.player.findMany({
		where: { gameId },
		select: {
			id: true,
			userId: true,
			score: true,
			correctAnswers: true,
			incorrectAnswers: true,
			expiredClicks: true,
			longestCorrectStreak: true,
			topicsPlayed: true,
			joinedAt: true,
			clicks: {
				select: {
					position: true,
					reactionMs: true,
					gameId: true,
					questionId: true,
				},
			},
		},
	});

	// Compute last-position per (gameId, questionId) by grouping clicks so we
	// can count each player's `lastClicks` without needing a second query.
	const maxPositionPerQuestion = new Map<string, number>();
	for (const p of players) {
		for (const c of p.clicks) {
			const key = `${c.gameId}:${c.questionId}`;
			const prev = maxPositionPerQuestion.get(key) ?? 0;
			if (c.position > prev) maxPositionPerQuestion.set(key, c.position);
		}
	}

	type PlayerAggregate = {
		id: string;
		userId: string;
		score: number;
		correctAnswers: number;
		incorrectAnswers: number;
		expiredClicks: number;
		longestCorrectStreak: number;
		topicsPlayed: number;
		joinedAt: Date;
		fastestClickMs: number | null;
		averageClickMs: number | null;
		totalClicks: number;
		firstClicks: number;
		lastClicks: number;
	};

	const aggregates: PlayerAggregate[] = players.map((p) => {
		const reactionTimes = p.clicks
			.map((c) => c.reactionMs)
			.filter((r): r is number => r !== null);

		const fastestClickMs =
			reactionTimes.length > 0 ? Math.min(...reactionTimes) : null;
		const averageClickMs =
			reactionTimes.length > 0
				? reactionTimes.reduce((s, r) => s + r, 0) / reactionTimes.length
				: null;

		const firstClicks = p.clicks.filter((c) => c.position === 1).length;
		const lastClicks = p.clicks.filter((c) => {
			const key = `${c.gameId}:${c.questionId}`;
			return c.position === maxPositionPerQuestion.get(key);
		}).length;

		return {
			id: p.id,
			userId: p.userId,
			score: p.score,
			correctAnswers: p.correctAnswers,
			incorrectAnswers: p.incorrectAnswers,
			expiredClicks: p.expiredClicks,
			longestCorrectStreak: p.longestCorrectStreak,
			topicsPlayed: p.topicsPlayed,
			joinedAt: p.joinedAt,
			fastestClickMs,
			averageClickMs,
			totalClicks: p.clicks.length,
			firstClicks,
			lastClicks,
		};
	});

	// 3. Rank players: score → correctAnswers → fewer incorrectAnswers →
	//    more totalClicks → joinedAt; competition ranks for ties on the first four.
	const ranked = [...aggregates].sort((a, b) =>
		compareStandingsOrder(
			{
				score: a.score,
				correctAnswers: a.correctAnswers,
				incorrectAnswers: a.incorrectAnswers,
				totalClicks: a.totalClicks,
				joinedAt: a.joinedAt,
			},
			{
				score: b.score,
				correctAnswers: b.correctAnswers,
				incorrectAnswers: b.incorrectAnswers,
				totalClicks: b.totalClicks,
				joinedAt: b.joinedAt,
			},
		),
	);

	const standingsRanks = competitionRanksFromSorted(
		ranked.map((p) => ({
			score: p.score,
			correctAnswers: p.correctAnswers,
			incorrectAnswers: p.incorrectAnswers,
			totalClicks: p.totalClicks,
			joinedAt: p.joinedAt,
		})),
	);

	const winnerId = ranked[0]?.id ?? null;
	const maxStandingsRank =
		standingsRanks.length > 0 ? Math.max(...standingsRanks) : 0;

	// 4. Persist per-player rank + click stats.
	for (let i = 0; i < ranked.length; i++) {
		const p = ranked[i];
		if (!p) continue;
		const rank = standingsRanks[i] ?? i + 1;
		await tx.player.update({
			where: { id: p.id },
			data: {
				rank,
				fastestClickMs: p.fastestClickMs,
				averageClickMs: p.averageClickMs,
				totalClicks: p.totalClicks,
				firstClicks: p.firstClicks,
				lastClicks: p.lastClicks,
			},
		});
	}

	const winnerAggregate = ranked[0];
	if (
		winnerAggregate &&
		winnerId === winnerAggregate.id &&
		winnerAggregate.incorrectAnswers === 0
	) {
		const existingMag = await tx.playerBadgeAward.findFirst({
			where: {
				playerId: winnerAggregate.id,
				badgeId: "magnificent",
			},
			select: { id: true },
		});
		if (!existingMag) {
			const winnerRow = await tx.player.findUnique({
				where: { id: winnerAggregate.id },
				select: {
					user: { select: { name: true, username: true } },
				},
			});
			if (winnerRow?.user) {
				await createPlayerBadgeAward(
					{
						playerId: winnerAggregate.id,
						badgeId: "magnificent",
						gameTopicId: null,
						gameQuestionId: null,
					},
					tx,
				);
				badgeEvents = [
					...badgeEvents,
					{
						badgeId: "magnificent",
						playerId: winnerAggregate.id,
						playerName: winnerRow.user.name,
						username: winnerRow.user.username,
						gameTopicId: null,
						gameQuestionId: null,
					},
				];
			}
		}
	}

	const gameTopicsForBadges = await tx.gameTopic.findMany({
		where: { gameId },
		select: { topicId: true },
	});

	if (gameTopicsForBadges.length > 0) {
		const netRows = await tx.click.groupBy({
			by: ["playerId", "topicId"],
			where: { gameId },
			_sum: { pointsAwarded: true },
		});

		const netByPlayerTopic = new Map<string, Map<string, number>>();
		for (const row of netRows) {
			let inner = netByPlayerTopic.get(row.playerId);
			if (!inner) {
				inner = new Map();
				netByPlayerTopic.set(row.playerId, inner);
			}
			inner.set(row.topicId, row._sum.pointsAwarded ?? 0);
		}

		const topicIds = gameTopicsForBadges.map((gt) => gt.topicId);

		const appendGameBadgeEvent = async (
			playerId: string,
			badgeId: "genius" | "dunce",
		) => {
			const existing = await tx.playerBadgeAward.findFirst({
				where: {
					playerId,
					badgeId,
					player: { gameId },
				},
				select: { id: true },
			});
			if (existing) {
				return;
			}
			const prow = await tx.player.findUnique({
				where: { id: playerId },
				select: {
					user: { select: { name: true, username: true } },
				},
			});
			if (!prow?.user) {
				return;
			}
			await createPlayerBadgeAward(
				{
					playerId,
					badgeId,
					gameTopicId: null,
					gameQuestionId: null,
				},
				tx,
			);
			badgeEvents = [
				...badgeEvents,
				{
					badgeId,
					playerId,
					playerName: prow.user.name,
					username: prow.user.username,
					gameTopicId: null,
					gameQuestionId: null,
				},
			];
		};

		for (const p of ranked) {
			const topicNet = netByPlayerTopic.get(p.id) ?? new Map<string, number>();
			let geniusOk = true;
			let dunceOk = true;
			for (const tid of topicIds) {
				const net = topicNet.get(tid) ?? 0;
				if (net <= 0) {
					geniusOk = false;
				}
				if (net > 0) {
					dunceOk = false;
				}
			}
			if (geniusOk) {
				await appendGameBadgeEvent(p.id, "genius");
			}
			if (dunceOk) {
				await appendGameBadgeEvent(p.id, "dunce");
			}
		}
	}

	const startedAt = game.startedAt ?? now;
	const durationSeconds = Math.max(
		0,
		Math.round((now.getTime() - startedAt.getTime()) / 1000),
	);

	// The historical completeGame path bumped totals by 1 for the trailing
	// question/topic. Only do that if we actually closed something this call.
	const trailingQuestionWasFinalized =
		game.currentTopicOrder !== null && game.currentQuestionOrder !== null;

	// 5. Roll up aggregates onto the player's User row. xp + level recompute
	//    requires a second read per user (prisma can't derive from fields),
	//    so we batch it as (read xp) -> (update with computed level).
	const totalGameQuestions = await tx.gameQuestion.count({
		where: { gameTopic: { gameId } },
	});

	// Elo: snapshot ratings; apply for any finished session that had started
	// (including host-ended games with force) when 2+ players, not only completeGame.
	const rankedUserIds = ranked.map((p) => p.userId);
	const ratingByUserId = new Map<string, number>();
	if (rankedUserIds.length >= 2) {
		const usersForElo = await tx.user.findMany({
			where: { id: { in: rankedUserIds } },
			select: { id: true, elo: true },
		});
		for (const u of usersForElo) {
			ratingByUserId.set(u.id, u.elo);
		}
	}
	const eloRows =
		rankedUserIds.length >= 2
			? ranked.map((p, i) => ({
					userId: p.userId,
					rank: standingsRanks[i] ?? i + 1,
					score: p.score,
					ratingBefore: ratingByUserId.get(p.userId) ?? 1000,
				}))
			: [];
	const eloDeltas =
		eloRows.length >= 2
			? calculateEloDeltas(eloRows, { forceAborted: false })
			: new Map<string, number>();

	for (let i = 0; i < ranked.length; i++) {
		const p = ranked[i];
		if (!p) continue;
		const rank = standingsRanks[i] ?? i + 1;

		// XP/level is only for the host (hosting + pack work); Elo and aggregates reflect play.
		const currentUser = await tx.user.findUnique({
			where: { id: p.userId },
			select: { elo: true, peakElo: true, lowestElo: true },
		});

		const eloDelta = eloDeltas.get(p.userId) ?? 0;
		let eloPatch: {
			elo: number;
			peakElo: number;
			lowestElo: number;
		} | null = null;
		if (rankedUserIds.length >= 2 && currentUser) {
			const nextElo = currentUser.elo + eloDelta;
			eloPatch = {
				elo: nextElo,
				peakElo: Math.max(currentUser.peakElo, nextElo),
				lowestElo: Math.min(currentUser.lowestElo, nextElo),
			};
		}

		await tx.user.update({
			where: { id: p.userId },
			data: {
				totalGamesPlayed: { increment: 1 },
				totalWins: { increment: rank === 1 ? 1 : 0 },
				totalPodiums: { increment: rank <= 3 ? 1 : 0 },
				totalLastPlaces: {
					increment: maxStandingsRank > 0 && rank === maxStandingsRank ? 1 : 0,
				},
				totalPointsEarned: { increment: Math.max(0, p.score) },
				totalCorrectAnswers: { increment: p.correctAnswers },
				totalIncorrectAnswers: { increment: p.incorrectAnswers },
				totalExpiredAnswers: { increment: p.expiredClicks },
				totalFirstClicks: { increment: p.firstClicks },
				totalTopicsPlayed: { increment: p.topicsPlayed },
				totalQuestionsPlayed: { increment: totalGameQuestions },
				totalTimeSpentPlaying: { increment: durationSeconds },
				...(eloPatch ?? {}),
			},
		});
	}

	// 6. Host: XP/level for hosting a completed session (including host-ended games).
	const hostUser = await tx.user.findUnique({
		where: { id: game.hostId },
		select: { xp: true },
	});
	const newHostXp = (hostUser?.xp ?? 0) + HOST_FULL_GAME_COMPLETION_XP_BONUS;
	await tx.user.update({
		where: { id: game.hostId },
		data: {
			totalGamesHosted: { increment: 1 },
			totalTimeSpentHosting: { increment: durationSeconds },
			xp: newHostXp,
			level: computeLevelFromXp(newHostXp),
		},
	});

	// 7. Finalize the Game row.
	const eloDeltaByUserId: Record<string, number> = {};
	for (const p of ranked) {
		const d = eloDeltas.get(p.userId) ?? 0;
		if (d !== 0) eloDeltaByUserId[p.userId] = d;
	}
	const completionDeltas: Prisma.InputJsonValue = {
		v: 1,
		hostXpGained: HOST_FULL_GAME_COMPLETION_XP_BONUS,
		eloDeltaByUserId,
	};
	await tx.game.update({
		where: { id: gameId },
		data: {
			status: "completed",
			finishedAt: now,
			durationSeconds,
			winnerId,
			totalQuestions: trailingQuestionWasFinalized
				? { increment: 1 }
				: undefined,
			totalTopics: topicWasClosed ? { increment: 1 } : undefined,
			totalUnresolvedQuestions: leavingWasSkipped
				? { increment: 1 }
				: undefined,
			completionDeltas,
		},
	});

	// 8. Bump pack play count.
	await tx.pack.update({
		where: { id: game.packId },
		data: { totalPlays: { increment: 1 } },
	});

	return {
		gameId,
		wasAlreadyCompleted: false,
		winnerId,
		finishedAt: now,
		durationSeconds,
		playerRanks: ranked.map((p, i) => ({
			id: p.id,
			rank: standingsRanks[i] ?? i + 1,
			score: p.score,
		})),
		badgeEvents,
	};
}
