import prisma from "@xamsa/db";

import { publishBadgeEarned } from "./publish";
import { createPlayerBadgeAward } from "./service";

type MaybeAwardScavengerInput = {
	code: string;
	gameId: string;
	currentTopicOrder: number;
	questionId: string;
	resolvingPlayerId: string;
};

/**
 * Scavenger: last in buzz queue, everyone before was wrong, mark correct, ≥3 buzzes.
 * Runs after the resolve transaction has committed.
 */
export async function maybeAwardScavenger(
	input: MaybeAwardScavengerInput,
): Promise<void> {
	const gq = await prisma.gameQuestion.findFirst({
		where: {
			gameTopic: { gameId: input.gameId, order: input.currentTopicOrder },
			questionId: input.questionId,
		},
		select: { id: true, gameTopicId: true },
	});

	if (!gq) {
		return;
	}

	const allClicks = await prisma.click.findMany({
		where: { gameId: input.gameId, questionId: input.questionId },
		orderBy: { position: "asc" },
		select: { position: true, status: true, playerId: true },
	});

	if (allClicks.length < 3) {
		return;
	}

	const winner = allClicks.find((c) => c.playerId === input.resolvingPlayerId);
	if (!winner || winner.status !== "correct") {
		return;
	}

	const maxPos = Math.max(...allClicks.map((c) => c.position));
	if (winner.position !== maxPos) {
		return;
	}

	for (const c of allClicks) {
		if (c.position < winner.position && c.status !== "wrong") {
			return;
		}
	}

	const existing = await prisma.playerBadgeAward.findFirst({
		where: {
			playerId: winner.playerId,
			badgeId: "scavenger",
			gameQuestionId: gq.id,
		},
		select: { id: true },
	});
	if (existing) {
		return;
	}

	const row = await prisma.player.findUnique({
		where: { id: winner.playerId },
		select: { user: { select: { name: true, username: true } } },
	});
	if (!row) {
		return;
	}

	await createPlayerBadgeAward({
		playerId: winner.playerId,
		badgeId: "scavenger",
		gameQuestionId: gq.id,
	});

	await publishBadgeEarned(input.code, {
		badgeId: "scavenger",
		playerId: winner.playerId,
		playerName: row.user.name,
		username: row.user.username,
		gameTopicId: gq.gameTopicId,
		gameQuestionId: gq.id,
	});
}
