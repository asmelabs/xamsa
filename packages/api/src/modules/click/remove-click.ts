import { ORPCError } from "@orpc/server";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { ablyRest } from "@xamsa/ably/server";
import type { Prisma } from "@xamsa/db";
import prisma from "@xamsa/db";
import type { ClickRemoveInputType } from "@xamsa/schemas/modules/click";
import {
	normalizeToQdr,
	recomputePdr,
	recomputeTdr,
} from "@xamsa/utils/difficulty-rate";
import { awardTopicBadges } from "../badge/topic-badges";
import { rollupFinalizedGameTopicTotals } from "../game/finalize";

const TOPIC_ROLLUP_BADGE_IDS = [
	"ace",
	"abomination",
	"ghost",
	"jackpot",
	"bankrupt",
] as const;

async function syncPlayerBuzzAggregates(
	tx: Prisma.TransactionClient,
	playerId: string,
	gameId: string,
) {
	const clicks = await tx.click.findMany({
		where: { playerId, gameId },
		select: {
			id: true,
			status: true,
			pointsAwarded: true,
			position: true,
			questionId: true,
			gameId: true,
			answeredAt: true,
			clickedAt: true,
			reactionMs: true,
		},
		orderBy: [{ clickedAt: "asc" }, { id: "asc" }],
	});

	const score = clicks.reduce((s, c) => s + c.pointsAwarded, 0);
	const correctAnswers = clicks.filter((c) => c.status === "correct").length;
	const incorrectAnswers = clicks.filter((c) => c.status === "wrong").length;
	const expiredClicks = clicks.filter((c) => c.status === "expired").length;

	const maxPositionByQuestion = new Map<string, number>();
	for (const c of clicks) {
		const key = `${c.gameId}:${c.questionId}`;
		const prev = maxPositionByQuestion.get(key) ?? 0;
		if (c.position > prev) maxPositionByQuestion.set(key, c.position);
	}
	const firstClicks = clicks.filter((c) => c.position === 1).length;
	const lastClicks = clicks.filter((c) => {
		const key = `${c.gameId}:${c.questionId}`;
		return c.position === maxPositionByQuestion.get(key);
	}).length;

	const reactionTimes = clicks
		.map((c) => c.reactionMs)
		.filter((r): r is number => r !== null);
	const fastestClickMs =
		reactionTimes.length > 0 ? Math.min(...reactionTimes) : null;
	const averageClickMs =
		reactionTimes.length > 0
			? reactionTimes.reduce((s, r) => s + r, 0) / reactionTimes.length
			: null;

	const resolved = clicks
		.filter((c) => c.status === "correct" || c.status === "wrong")
		.sort((a, b) => {
			const ta = (a.answeredAt ?? a.clickedAt).getTime();
			const tb = (b.answeredAt ?? b.clickedAt).getTime();
			if (ta !== tb) return ta - tb;
			return a.id.localeCompare(b.id);
		});

	let currentCorrectStreak = 0;
	let currentWrongStreak = 0;
	let longestCorrectStreak = 0;
	let longestWrongStreak = 0;
	for (const c of resolved) {
		if (c.status === "correct") {
			currentCorrectStreak += 1;
			currentWrongStreak = 0;
			longestCorrectStreak = Math.max(
				longestCorrectStreak,
				currentCorrectStreak,
			);
		} else {
			currentWrongStreak += 1;
			currentCorrectStreak = 0;
			longestWrongStreak = Math.max(longestWrongStreak, currentWrongStreak);
		}
	}

	let peakScore = 0;
	let lowestScore = 0;
	let running = 0;
	for (const c of clicks) {
		running += c.pointsAwarded;
		peakScore = Math.max(peakScore, running);
		lowestScore = Math.min(lowestScore, running);
	}

	await tx.player.update({
		where: { id: playerId },
		data: {
			score,
			peakScore,
			lowestScore,
			correctAnswers,
			incorrectAnswers,
			expiredClicks,
			firstClicks,
			lastClicks,
			fastestClickMs,
			averageClickMs,
			currentCorrectStreak,
			currentWrongStreak,
			longestCorrectStreak,
			longestWrongStreak,
		},
	});

	return {
		playerId,
		score,
		correctAnswers,
		incorrectAnswers,
		expiredClicks,
		currentCorrectStreak,
		currentWrongStreak,
		longestCorrectStreak,
		longestWrongStreak,
		peakScore,
		lowestScore,
	};
}

async function refreshFinalizedGameQuestionFromClicks(
	tx: Prisma.TransactionClient,
	gameQuestionId: string,
	gameId: string,
	questionId: string,
) {
	const gq = await tx.gameQuestion.findUnique({
		where: { id: gameQuestionId },
		select: {
			finishedAt: true,
			startedAt: true,
			wasSkipped: true,
			wasRevealed: true,
		},
	});
	if (!gq?.finishedAt || gq.wasSkipped) {
		return;
	}

	const clicks = await tx.click.findMany({
		where: { gameId, questionId },
		select: {
			playerId: true,
			status: true,
			clickedAt: true,
			pointsAwarded: true,
		},
	});

	if (clicks.length === 0) {
		await tx.gameQuestion.update({
			where: { id: gameQuestionId },
			data: {
				status: "revealed",
				winnerId: null,
				totalClicks: 0,
				totalCorrectAnswers: 0,
				totalIncorrectAnswers: 0,
				totalExpiredClicks: 0,
				firstBuzzMs: null,
				wasRevealed: gq.wasRevealed,
			},
		});
		return;
	}

	const correctClicks = clicks.filter((c) => c.status === "correct");
	const wrongClicks = clicks.filter((c) => c.status === "wrong");
	const expiredClicks = clicks.filter((c) => c.status === "expired");
	const winnerId = correctClicks[0]?.playerId ?? null;
	const wasAnswered = winnerId !== null;

	const startedAt = gq.startedAt ?? new Date();
	const firstBuzzMs = Math.min(
		...clicks.map((c) =>
			Math.max(0, c.clickedAt.getTime() - startedAt.getTime()),
		),
	);

	const status = wasAnswered
		? ("answered" as const)
		: clicks.some((c) => c.status !== "pending")
			? ("revealed" as const)
			: ("pending" as const);

	await tx.gameQuestion.update({
		where: { id: gameQuestionId },
		data: {
			status,
			winnerId,
			totalClicks: clicks.length,
			totalCorrectAnswers: correctClicks.length,
			totalIncorrectAnswers: wrongClicks.length,
			totalExpiredClicks: expiredClicks.length,
			firstBuzzMs,
			wasRevealed: gq.wasRevealed,
		},
	});
}

async function syncCurrentQuestionRevealFlag(
	tx: Prisma.TransactionClient,
	gameId: string,
	questionId: string,
	topicOrder: number,
	questionOrder: number,
) {
	const gameRow = await tx.game.findUnique({
		where: { id: gameId },
		select: {
			isQuestionRevealed: true,
			currentTopicOrder: true,
			currentQuestionOrder: true,
		},
	});
	if (!gameRow) return;

	const isCurrent =
		gameRow.currentTopicOrder === topicOrder &&
		gameRow.currentQuestionOrder === questionOrder;
	if (!isCurrent) return;

	const clicks = await tx.click.findMany({
		where: { gameId, questionId },
		select: { status: true },
	});

	if (clicks.length === 0) {
		return;
	}

	const activeCount = await tx.player.count({
		where: { gameId, status: "playing" },
	});
	const pending = clicks.filter((c) => c.status === "pending").length;
	const nonPending = clicks.length - pending;
	const anyCorrect = clicks.some((c) => c.status === "correct");
	const shouldReveal =
		anyCorrect || (pending === 0 && nonPending >= activeCount);

	if (gameRow.isQuestionRevealed !== shouldReveal) {
		await tx.game.update({
			where: { id: gameId },
			data: { isQuestionRevealed: shouldReveal },
		});
	}
}

/**
 * Delete every click on a pack question in a game: reverse game/QDR counters,
 * remove rows, and resync affected players. Used by host skip-question.
 */
export async function stripAllClicksForQuestionInTx(
	tx: Prisma.TransactionClient,
	params: {
		gameId: string;
		packId: string;
		questionId: string;
		packStatus: string | null;
	},
): Promise<{ playerIds: string[] }> {
	const clicks = await tx.click.findMany({
		where: { gameId: params.gameId, questionId: params.questionId },
		select: {
			id: true,
			playerId: true,
			status: true,
			pointsAwarded: true,
			qdrEloEquivDelta: true,
		},
	});
	const playerIds = [...new Set(clicks.map((c) => c.playerId))];

	for (const c of clicks) {
		const data: {
			totalAnswers?: { decrement: number };
			totalCorrectAnswers?: { decrement: number };
			totalIncorrectAnswers?: { decrement: number };
			totalExpiredAnswers?: { decrement: number };
			totalPointsAwarded?: { decrement: number };
			totalPointsDeducted?: { decrement: number };
		} = {};

		if (c.status !== "pending") {
			data.totalAnswers = { decrement: 1 };
			if (c.status === "correct") {
				data.totalCorrectAnswers = { decrement: 1 };
				if (c.pointsAwarded > 0) {
					data.totalPointsAwarded = { decrement: c.pointsAwarded };
				}
			} else if (c.status === "wrong") {
				data.totalIncorrectAnswers = { decrement: 1 };
				if (c.pointsAwarded < 0) {
					data.totalPointsDeducted = { decrement: -c.pointsAwarded };
				}
			} else if (c.status === "expired") {
				data.totalExpiredAnswers = { decrement: 1 };
			}
		}

		if (Object.keys(data).length > 0) {
			await tx.game.update({
				where: { id: params.gameId },
				data,
			});
		}

		if (
			c.qdrEloEquivDelta != null &&
			params.packStatus !== "archived" &&
			(c.status === "correct" || c.status === "wrong")
		) {
			const qRow = await tx.question.findUnique({
				where: { id: params.questionId },
				select: {
					qdrEloEquiv: true,
					qdrScoredAttempts: true,
					topicId: true,
				},
			});
			if (qRow && qRow.qdrScoredAttempts > 0) {
				const newElo = qRow.qdrEloEquiv - c.qdrEloEquivDelta;
				const newAttempts = qRow.qdrScoredAttempts - 1;
				const now = new Date();
				await tx.question.update({
					where: { id: params.questionId },
					data: {
						qdrEloEquiv: newElo,
						qdrScoredAttempts: newAttempts,
						qdr: normalizeToQdr(newElo),
						qdrUpdatedAt: now,
					},
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
					where: { packId: params.packId },
					select: { tdr: true },
				});
				const newPdr = recomputePdr(packTopics.map((t) => t.tdr));
				await tx.pack.update({
					where: { id: params.packId },
					data: { pdr: newPdr, pdrUpdatedAt: now },
				});
			}
		}
	}

	await tx.click.deleteMany({
		where: { gameId: params.gameId, questionId: params.questionId },
	});

	for (const pid of playerIds) {
		await syncPlayerBuzzAggregates(tx, pid, params.gameId);
	}

	return { playerIds };
}

/**
 * Host: fully remove a click from the game (active or paused only).
 * Removing a correct buzz that expired others is disallowed — use skip question.
 */
export async function removeClick(
	input: ClickRemoveInputType,
	userId: string,
): Promise<{
	playerScores: Awaited<ReturnType<typeof syncPlayerBuzzAggregates>>[];
}> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			hostId: true,
			status: true,
			packId: true,
			currentTopicOrder: true,
			currentQuestionOrder: true,
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", { message: "Game not found" });
	}
	if (game.hostId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the host can remove clicks",
		});
	}
	if (game.status === "completed") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Cannot remove clicks after the game has completed",
		});
	}
	if (game.status !== "active" && game.status !== "paused") {
		throw new ORPCError("BAD_REQUEST", { message: "Game is not in progress" });
	}

	const packRow = await prisma.pack.findUnique({
		where: { id: game.packId },
		select: { status: true },
	});

	const click = await prisma.click.findUnique({
		where: { id: input.clickId },
		select: {
			id: true,
			gameId: true,
			questionId: true,
			playerId: true,
			topicId: true,
			status: true,
			position: true,
			pointsAwarded: true,
			qdrEloEquivDelta: true,
		},
	});

	if (!click || click.gameId !== game.id) {
		throw new ORPCError("NOT_FOUND", { message: "Click not found" });
	}

	const questionMeta = await prisma.question.findUnique({
		where: { id: click.questionId },
		select: {
			order: true,
			topic: { select: { order: true } },
		},
	});
	if (!questionMeta) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Question not found for click",
		});
	}

	if (click.status === "correct") {
		const expiredSiblings = await prisma.click.count({
			where: {
				gameId: game.id,
				questionId: click.questionId,
				status: "expired",
				id: { not: click.id },
			},
		});
		if (expiredSiblings > 0) {
			throw new ORPCError("BAD_REQUEST", {
				message:
					"Cannot remove a correct buzz while other players were expired on this question. Skip the question instead.",
			});
		}
	}

	const gameQuestion = await prisma.gameQuestion.findFirst({
		where: {
			questionId: click.questionId,
			gameTopic: { gameId: game.id },
		},
		select: { id: true, gameTopicId: true },
	});

	const playerScores: Awaited<ReturnType<typeof syncPlayerBuzzAggregates>>[] =
		[];

	await prisma.$transaction(async (tx) => {
		const c = await tx.click.findUnique({
			where: { id: click.id },
			select: {
				id: true,
				gameId: true,
				questionId: true,
				playerId: true,
				topicId: true,
				status: true,
				position: true,
				pointsAwarded: true,
				qdrEloEquivDelta: true,
			},
		});
		if (!c) {
			throw new ORPCError("NOT_FOUND", { message: "Click no longer exists" });
		}

		const data: {
			totalAnswers?: { decrement: number };
			totalCorrectAnswers?: { decrement: number };
			totalIncorrectAnswers?: { decrement: number };
			totalExpiredAnswers?: { decrement: number };
			totalPointsAwarded?: { decrement: number };
			totalPointsDeducted?: { decrement: number };
		} = {};

		if (c.status !== "pending") {
			data.totalAnswers = { decrement: 1 };
			if (c.status === "correct") {
				data.totalCorrectAnswers = { decrement: 1 };
				if (c.pointsAwarded > 0) {
					data.totalPointsAwarded = { decrement: c.pointsAwarded };
				}
			} else if (c.status === "wrong") {
				data.totalIncorrectAnswers = { decrement: 1 };
				if (c.pointsAwarded < 0) {
					data.totalPointsDeducted = { decrement: -c.pointsAwarded };
				}
			} else if (c.status === "expired") {
				data.totalExpiredAnswers = { decrement: 1 };
			}
		}

		if (Object.keys(data).length > 0) {
			await tx.game.update({
				where: { id: game.id },
				data,
			});
		}

		if (
			c.qdrEloEquivDelta != null &&
			packRow?.status !== "archived" &&
			(c.status === "correct" || c.status === "wrong")
		) {
			const qRow = await tx.question.findUnique({
				where: { id: c.questionId },
				select: {
					qdrEloEquiv: true,
					qdrScoredAttempts: true,
					topicId: true,
				},
			});
			if (qRow && qRow.qdrScoredAttempts > 0) {
				const newElo = qRow.qdrEloEquiv - c.qdrEloEquivDelta;
				const newAttempts = qRow.qdrScoredAttempts - 1;
				const now = new Date();
				await tx.question.update({
					where: { id: c.questionId },
					data: {
						qdrEloEquiv: newElo,
						qdrScoredAttempts: newAttempts,
						qdr: normalizeToQdr(newElo),
						qdrUpdatedAt: now,
					},
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

		if (gameQuestion?.id) {
			await tx.playerBadgeAward.deleteMany({
				where: {
					gameQuestionId: gameQuestion.id,
					playerId: c.playerId,
					badgeId: "scavenger",
				},
			});
		}

		await tx.click.delete({ where: { id: c.id } });

		const remaining = await tx.click.findMany({
			where: { gameId: c.gameId, questionId: c.questionId },
			orderBy: { position: "asc" },
			select: { id: true },
		});
		for (let i = 0; i < remaining.length; i++) {
			const row = remaining[i];
			if (!row) continue;
			const pos = i + 1;
			await tx.click.update({
				where: { id: row.id },
				data: { position: pos },
			});
		}

		if (gameQuestion?.id) {
			await refreshFinalizedGameQuestionFromClicks(
				tx,
				gameQuestion.id,
				c.gameId,
				c.questionId,
			);
		}

		if (gameQuestion?.gameTopicId) {
			const gt = await tx.gameTopic.findUnique({
				where: { id: gameQuestion.gameTopicId },
				select: { finishedAt: true },
			});
			if (gt?.finishedAt) {
				await rollupFinalizedGameTopicTotals(tx, gameQuestion.gameTopicId);
				await tx.playerBadgeAward.deleteMany({
					where: {
						gameTopicId: gameQuestion.gameTopicId,
						badgeId: { in: [...TOPIC_ROLLUP_BADGE_IDS] },
					},
				});
				await awardTopicBadges(tx, gameQuestion.gameTopicId);
			}
		}

		const ps = await syncPlayerBuzzAggregates(tx, c.playerId, c.gameId);
		playerScores.push(ps);

		await syncCurrentQuestionRevealFlag(
			tx,
			game.id,
			c.questionId,
			questionMeta.topic.order,
			questionMeta.order,
		);
	});

	const channel = ablyRest.channels.get(channels.game(input.code));
	await channel.publish(GAME_EVENTS.CLICK_REMOVED, {
		clickId: click.id,
		questionId: click.questionId,
		playerId: click.playerId,
		playerScores,
		isAuthoritative: true,
	});

	return { playerScores };
}
