import type { BadgeEarnedMessage } from "@xamsa/ably/channels";
import type { Prisma } from "@xamsa/db";

import { awardTopicBadges } from "../badge/topic-badges";

export type FinalizeGameQuestionResult = {
	gameQuestionId: string;
	winnerId: string | null;
	wasAnswered: boolean;
	totalClicks: number;
	totalCorrectAnswers: number;
	totalIncorrectAnswers: number;
	totalExpiredClicks: number;
	pointsAwardedSum: number;
	pointsDeductedSum: number;
	distinctPlayerIds: string[];
};

export type FinalizeGameQuestionOptions = {
	/**
	 * When true, the trailing question is treated as skipped rather than
	 * revealed. Used by force-finalize paths (host abandonment, last player
	 * leaves, etc.) where the question never got to a clean resolution.
	 */
	markAsSkip?: boolean;
};

/**
 * Finalize the currently-active GameQuestion for a game. Backfills reactionMs
 * for every click, flips any straggler pending clicks to expired (with player
 * stat side-effects), aggregates counts, and closes out the GameQuestion row.
 *
 * Safe to call inside a $transaction — takes the Prisma transaction client.
 */
export async function finalizeGameQuestion(
	tx: Prisma.TransactionClient,
	gameQuestionId: string,
	options: FinalizeGameQuestionOptions = {},
): Promise<FinalizeGameQuestionResult> {
	const now = new Date();

	const gameQuestion = await tx.gameQuestion.findUnique({
		where: { id: gameQuestionId },
		select: {
			id: true,
			questionId: true,
			startedAt: true,
			gameTopic: {
				select: {
					gameId: true,
					topicId: true,
				},
			},
		},
	});

	if (!gameQuestion) {
		throw new Error(`GameQuestion ${gameQuestionId} not found`);
	}

	const { gameId } = gameQuestion.gameTopic;
	const questionStartedAt = gameQuestion.startedAt ?? now;

	const clicks = await tx.click.findMany({
		where: { gameId, questionId: gameQuestion.questionId },
		select: {
			id: true,
			playerId: true,
			status: true,
			clickedAt: true,
			position: true,
			pointsAwarded: true,
		},
	});

	// 1. Backfill reactionMs for every click, and coerce any lingering pending
	//    clicks to expired.
	const pendingPlayerIds: string[] = [];
	for (const c of clicks) {
		const reactionMs = Math.max(
			0,
			c.clickedAt.getTime() - questionStartedAt.getTime(),
		);
		if (c.status === "pending") {
			pendingPlayerIds.push(c.playerId);
			await tx.click.update({
				where: { id: c.id },
				data: {
					status: "expired",
					answeredAt: now,
					pointsAwarded: 0,
					reactionMs,
				},
			});
			c.status = "expired";
			c.pointsAwarded = 0;
		} else {
			await tx.click.update({
				where: { id: c.id },
				data: { reactionMs },
			});
		}
	}

	// 2. Compensate player expiredClicks for any clicks we just forced-expired.
	for (const playerId of pendingPlayerIds) {
		await tx.player.update({
			where: { id: playerId },
			data: { expiredClicks: { increment: 1 } },
		});
	}

	// 3. Aggregate counts.
	const totalClicks = clicks.length;
	const correctClicks = clicks.filter((c) => c.status === "correct");
	const wrongClicks = clicks.filter((c) => c.status === "wrong");
	const expiredClicks = clicks.filter((c) => c.status === "expired");

	const winnerId = correctClicks[0]?.playerId ?? null;
	const wasAnswered = winnerId !== null;

	const firstBuzzMs =
		clicks.length > 0
			? Math.min(
					...clicks.map((c) =>
						Math.max(0, c.clickedAt.getTime() - questionStartedAt.getTime()),
					),
				)
			: null;

	const pointsAwardedSum = clicks
		.filter((c) => c.pointsAwarded > 0)
		.reduce((sum, c) => sum + c.pointsAwarded, 0);
	const pointsDeductedSum = clicks
		.filter((c) => c.pointsAwarded < 0)
		.reduce((sum, c) => sum + Math.abs(c.pointsAwarded), 0);

	const durationSeconds = Math.max(
		0,
		Math.round((now.getTime() - questionStartedAt.getTime()) / 1000),
	);

	const forceSkip = options.markAsSkip === true && !wasAnswered;

	await tx.gameQuestion.update({
		where: { id: gameQuestionId },
		data: {
			status: wasAnswered ? "answered" : forceSkip ? "skipped" : "revealed",
			wasRevealed: !forceSkip,
			wasSkipped: forceSkip,
			winnerId,
			totalClicks,
			totalCorrectAnswers: correctClicks.length,
			totalIncorrectAnswers: wrongClicks.length,
			totalExpiredClicks: expiredClicks.length,
			firstBuzzMs,
			durationSeconds,
			finishedAt: now,
		},
	});

	const distinctPlayerIds = Array.from(new Set(clicks.map((c) => c.playerId)));

	return {
		gameQuestionId,
		winnerId,
		wasAnswered,
		totalClicks,
		totalCorrectAnswers: correctClicks.length,
		totalIncorrectAnswers: wrongClicks.length,
		totalExpiredClicks: expiredClicks.length,
		pointsAwardedSum,
		pointsDeductedSum,
		distinctPlayerIds,
	};
}

/**
 * Finalize a GameTopic: rolls up every finalized child GameQuestion's stats,
 * determines the top scorer for this topic, increments `topicsPlayed` on every
 * player that participated (buzzed at least once) in the topic.
 */
export async function finalizeGameTopic(
	tx: Prisma.TransactionClient,
	gameTopicId: string,
): Promise<BadgeEarnedMessage[]> {
	const now = new Date();

	const gameTopic = await tx.gameTopic.findUnique({
		where: { id: gameTopicId },
		select: {
			id: true,
			gameId: true,
			topicId: true,
			startedAt: true,
			questions: {
				select: {
					status: true,
					totalClicks: true,
					totalCorrectAnswers: true,
					totalIncorrectAnswers: true,
					totalExpiredClicks: true,
				},
			},
		},
	});

	if (!gameTopic) {
		throw new Error(`GameTopic ${gameTopicId} not found`);
	}

	const topicClicks = await tx.click.findMany({
		where: { gameId: gameTopic.gameId, topicId: gameTopic.topicId },
		select: { playerId: true, pointsAwarded: true },
	});

	const totals = gameTopic.questions.reduce(
		(acc, q) => ({
			totalClicks: acc.totalClicks + q.totalClicks,
			totalCorrectAnswers: acc.totalCorrectAnswers + q.totalCorrectAnswers,
			totalIncorrectAnswers:
				acc.totalIncorrectAnswers + q.totalIncorrectAnswers,
			totalExpiredClicks: acc.totalExpiredClicks + q.totalExpiredClicks,
		}),
		{
			totalClicks: 0,
			totalCorrectAnswers: 0,
			totalIncorrectAnswers: 0,
			totalExpiredClicks: 0,
		},
	);

	const totalQuestionsAnswered = gameTopic.questions.filter(
		(q) => q.status === "answered",
	).length;
	const totalQuestionsSkipped =
		gameTopic.questions.length - totalQuestionsAnswered;

	// Per-player point totals across this topic (positive sum only — we want
	// "points scored", not net score).
	const scoreByPlayer = new Map<string, number>();
	let pointsAwardedSum = 0;
	let pointsDeductedSum = 0;
	for (const c of topicClicks) {
		if (c.pointsAwarded > 0) pointsAwardedSum += c.pointsAwarded;
		if (c.pointsAwarded < 0) pointsDeductedSum += Math.abs(c.pointsAwarded);
		scoreByPlayer.set(
			c.playerId,
			(scoreByPlayer.get(c.playerId) ?? 0) + c.pointsAwarded,
		);
	}

	let topScorerId: string | null = null;
	let topScorerPoints = 0;
	for (const [playerId, points] of scoreByPlayer) {
		if (points > topScorerPoints) {
			topScorerId = playerId;
			topScorerPoints = points;
		}
	}

	const startedAt = gameTopic.startedAt ?? now;
	const durationSeconds = Math.max(
		0,
		Math.round((now.getTime() - startedAt.getTime()) / 1000),
	);

	await tx.gameTopic.update({
		where: { id: gameTopicId },
		data: {
			totalClicks: totals.totalClicks,
			totalCorrectAnswers: totals.totalCorrectAnswers,
			totalIncorrectAnswers: totals.totalIncorrectAnswers,
			totalExpiredClicks: totals.totalExpiredClicks,
			totalQuestionsAnswered,
			totalQuestionsSkipped,
			totalPointsAwarded: pointsAwardedSum,
			totalPointsDeducted: pointsDeductedSum,
			topScorerId,
			topScorerPoints,
			durationSeconds,
			finishedAt: now,
		},
	});

	// Increment `topicsPlayed` for every distinct player who buzzed at least
	// once in this topic.
	const distinctPlayerIds = Array.from(scoreByPlayer.keys());
	for (const playerId of distinctPlayerIds) {
		await tx.player.update({
			where: { id: playerId },
			data: { topicsPlayed: { increment: 1 } },
		});
	}

	return awardTopicBadges(tx, gameTopicId);
}

/**
 * Recompute denormalized GameTopic counters from finalized child GameQuestions
 * and live topic clicks — without bumping topicsPlayed or emitting badges.
 * Used after retroactive click removal corrupts a closed topic rollup.
 */
export async function rollupFinalizedGameTopicTotals(
	tx: Prisma.TransactionClient,
	gameTopicId: string,
): Promise<void> {
	const gameTopic = await tx.gameTopic.findUnique({
		where: { id: gameTopicId },
		select: {
			id: true,
			gameId: true,
			topicId: true,
			startedAt: true,
			finishedAt: true,
			questions: {
				select: {
					status: true,
					totalClicks: true,
					totalCorrectAnswers: true,
					totalIncorrectAnswers: true,
					totalExpiredClicks: true,
				},
			},
		},
	});

	if (!gameTopic?.finishedAt) {
		return;
	}

	const now = new Date();
	const topicClicks = await tx.click.findMany({
		where: { gameId: gameTopic.gameId, topicId: gameTopic.topicId },
		select: { playerId: true, pointsAwarded: true },
	});

	const totals = gameTopic.questions.reduce(
		(acc, q) => ({
			totalClicks: acc.totalClicks + q.totalClicks,
			totalCorrectAnswers: acc.totalCorrectAnswers + q.totalCorrectAnswers,
			totalIncorrectAnswers:
				acc.totalIncorrectAnswers + q.totalIncorrectAnswers,
			totalExpiredClicks: acc.totalExpiredClicks + q.totalExpiredClicks,
		}),
		{
			totalClicks: 0,
			totalCorrectAnswers: 0,
			totalIncorrectAnswers: 0,
			totalExpiredClicks: 0,
		},
	);

	const totalQuestionsAnswered = gameTopic.questions.filter(
		(q) => q.status === "answered",
	).length;
	const totalQuestionsSkipped =
		gameTopic.questions.length - totalQuestionsAnswered;

	const scoreByPlayer = new Map<string, number>();
	let pointsAwardedSum = 0;
	let pointsDeductedSum = 0;
	for (const c of topicClicks) {
		if (c.pointsAwarded > 0) pointsAwardedSum += c.pointsAwarded;
		if (c.pointsAwarded < 0) pointsDeductedSum += Math.abs(c.pointsAwarded);
		scoreByPlayer.set(
			c.playerId,
			(scoreByPlayer.get(c.playerId) ?? 0) + c.pointsAwarded,
		);
	}

	let topScorerId: string | null = null;
	let topScorerPoints = 0;
	for (const [playerId, points] of scoreByPlayer) {
		if (points > topScorerPoints) {
			topScorerId = playerId;
			topScorerPoints = points;
		}
	}

	const startedAt = gameTopic.startedAt ?? now;
	const durationSeconds = Math.max(
		0,
		Math.round((gameTopic.finishedAt.getTime() - startedAt.getTime()) / 1000),
	);

	await tx.gameTopic.update({
		where: { id: gameTopicId },
		data: {
			totalClicks: totals.totalClicks,
			totalCorrectAnswers: totals.totalCorrectAnswers,
			totalIncorrectAnswers: totals.totalIncorrectAnswers,
			totalExpiredClicks: totals.totalExpiredClicks,
			totalQuestionsAnswered,
			totalQuestionsSkipped,
			totalPointsAwarded: pointsAwardedSum,
			totalPointsDeducted: pointsDeductedSum,
			topScorerId,
			topScorerPoints,
			durationSeconds,
		},
	});
}
