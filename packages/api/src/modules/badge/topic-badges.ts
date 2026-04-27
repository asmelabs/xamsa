import type { BadgeEarnedMessage } from "@xamsa/ably/channels";
import type { Prisma } from "@xamsa/db";
import prisma from "@xamsa/db";
import type { BadgeId } from "@xamsa/utils/badges";

import { publishBadgeEarnedMany } from "./publish";
import { createPlayerBadgeAward } from "./service";

type PlayingPlayer = {
	id: string;
	user: { name: string | null; username: string };
};

/**
 * Topic boundary badges: ace, ghost, jackpot, bankrupt.
 * Idempotent: already-earned (player + topic + badge) is skipped. Safe to call
 * at question reveal and again in finalizeGameTopic (advance) so realtime can
 * fire as soon as the 5th question is done without duplicate rows/Ably.
 */
export async function awardTopicBadges(
	tx: Prisma.TransactionClient,
	gameTopicId: string,
): Promise<BadgeEarnedMessage[]> {
	const gameTopic = await tx.gameTopic.findUnique({
		where: { id: gameTopicId },
		select: {
			id: true,
			gameId: true,
			topicId: true,
			questions: { select: { id: true } },
		},
	});

	if (!gameTopic || gameTopic.questions.length !== 5) {
		return [];
	}

	const clicks = await tx.click.findMany({
		where: { gameId: gameTopic.gameId, topicId: gameTopic.topicId },
		select: { playerId: true, status: true, pointsAwarded: true },
	});

	const playingPlayers: PlayingPlayer[] = await tx.player.findMany({
		where: { gameId: gameTopic.gameId, status: "playing" },
		select: {
			id: true,
			user: { select: { name: true, username: true } },
		},
	});

	type Agg = { correct: number; wrong: number; net: number; buzzes: number };
	const aggs = new Map<string, Agg>();

	for (const c of clicks) {
		const a = aggs.get(c.playerId) ?? {
			correct: 0,
			wrong: 0,
			net: 0,
			buzzes: 0,
		};
		a.buzzes += 1;
		a.net += c.pointsAwarded;
		if (c.status === "correct") a.correct += 1;
		if (c.status === "wrong") a.wrong += 1;
		aggs.set(c.playerId, a);
	}

	const out: BadgeEarnedMessage[] = [];

	const push = async (player: PlayingPlayer, badgeId: BadgeId) => {
		const existing = await tx.playerBadgeAward.findFirst({
			where: {
				playerId: player.id,
				gameTopicId: gameTopic.id,
				badgeId,
			},
			select: { id: true },
		});
		if (existing) {
			return;
		}
		await createPlayerBadgeAward(
			{ playerId: player.id, badgeId, gameTopicId: gameTopic.id },
			tx,
		);
		out.push({
			badgeId,
			playerId: player.id,
			playerName: player.user.name,
			username: player.user.username,
			gameTopicId: gameTopic.id,
			gameQuestionId: null,
		});
	};

	for (const p of playingPlayers) {
		const a = aggs.get(p.id) ?? {
			correct: 0,
			wrong: 0,
			net: 0,
			buzzes: 0,
		};

		if (a.correct === 5 && a.wrong === 0) {
			await push(p, "ace");
		}
		if (a.buzzes === 0) {
			await push(p, "ghost");
		}
		if (a.net >= 1000) {
			await push(p, "jackpot");
		}
		if (a.net <= -500 && a.wrong >= 2) {
			await push(p, "bankrupt");
		}
	}

	return out;
}

/**
 * When the last question in the current pack topic is fully revealed, evaluate
 * topic badges and publish. Called after `resolveClick` has committed; advance
 * still runs `awardTopicBadges` again, which no-ops for existing rows.
 */
export async function tryPublishTopicBadgesForCompletedCurrentTopic(
	code: string,
	input: {
		gameId: string;
		currentTopicOrder: number;
		currentQuestionOrder: number;
	},
): Promise<void> {
	const gameTopic = await prisma.gameTopic.findFirst({
		where: { gameId: input.gameId, order: input.currentTopicOrder },
		select: { id: true, questions: { select: { order: true } } },
	});
	if (!gameTopic?.questions.length) {
		return;
	}
	const lastOrder = Math.max(...gameTopic.questions.map((q) => q.order));
	if (input.currentQuestionOrder !== lastOrder) {
		return;
	}
	const events = await prisma.$transaction((tx) =>
		awardTopicBadges(tx, gameTopic.id),
	);
	if (events.length > 0) {
		await publishBadgeEarnedMany(code, events);
	}
}
