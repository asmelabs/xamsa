import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	GetPublicBadgeSummaryByUsernameInputType,
	GetPublicBadgeSummaryByUsernameOutputType,
	ListBadgeEarnersInputType,
	ListBadgeEarnersOutputType,
} from "@xamsa/schemas/modules/badge";
import { type BadgeId, isBadgeId } from "@xamsa/utils/badges";
import { defineCursorPagination } from "@xamsa/utils/pagination";

import { requireUserIdByUsername } from "../user/service";

export async function listBadgeEarners(
	input: ListBadgeEarnersInputType,
): Promise<ListBadgeEarnersOutputType> {
	const pag = defineCursorPagination(input, input.limit);
	const cursorArgs = pag.use("id");

	const raw = await prisma.playerBadgeAward.findMany({
		where: { badgeId: input.badgeId },
		...cursorArgs,
		orderBy: [{ earnedAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			earnedAt: true,
			badgeId: true,
			gameTopic: {
				select: {
					order: true,
					topic: { select: { slug: true, name: true } },
				},
			},
			gameQuestion: {
				select: {
					order: true,
					gameTopic: {
						select: {
							order: true,
							topic: { select: { slug: true, name: true } },
						},
					},
				},
			},
			player: {
				select: {
					user: {
						select: { username: true, name: true, image: true },
					},
					game: {
						select: {
							code: true,
							pack: { select: { slug: true, name: true } },
						},
					},
				},
			},
		},
	});

	const items = raw.map((row) => {
		const topicFromGt = row.gameTopic;
		const gq = row.gameQuestion;
		const topicFromGq = gq?.gameTopic;
		const topic = topicFromGt
			? {
					order: topicFromGt.order,
					slug: topicFromGt.topic.slug,
					name: topicFromGt.topic.name,
				}
			: topicFromGq
				? {
						order: topicFromGq.order,
						slug: topicFromGq.topic.slug,
						name: topicFromGq.topic.name,
					}
				: null;

		return {
			id: row.id,
			earnedAt: row.earnedAt,
			user: row.player.user,
			game: row.player.game,
			topic,
			questionOrder: gq?.order ?? null,
		};
	});

	return pag.output(items, (r) => r.id);
}

export async function getPublicBadgeSummaryByUsername(
	input: GetPublicBadgeSummaryByUsernameInputType,
): Promise<GetPublicBadgeSummaryByUsernameOutputType> {
	const userId = await requireUserIdByUsername(input.username);

	const groups = await prisma.playerBadgeAward.groupBy({
		by: ["badgeId"],
		where: { player: { userId } },
		_count: { _all: true },
		_max: { earnedAt: true },
	});

	const rows: GetPublicBadgeSummaryByUsernameOutputType["rows"] = groups
		.map((g) => {
			if (!isBadgeId(g.badgeId)) return null;
			return {
				badgeId: g.badgeId as BadgeId,
				count: g._count._all,
				lastEarnedAt: g._max.earnedAt,
			};
		})
		.filter((r) => r !== null);

	return { rows };
}

type CreatePlayerBadgeAwardInput = {
	playerId: string;
	badgeId: string;
	gameTopicId?: string | null;
	gameQuestionId?: string | null;
	earnedAt?: Date;
};

/**
 * Inserts a badge row. Call from game logic (e.g. topic / click finalizers) — not exposed as a public ORPC route.
 */
export async function createPlayerBadgeAward(
	data: CreatePlayerBadgeAwardInput,
	tx?: Prisma.TransactionClient,
): Promise<{ id: string }> {
	if (!isBadgeId(data.badgeId)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid badge id",
		});
	}
	const db = tx ?? prisma;
	return db.playerBadgeAward.create({
		data: {
			playerId: data.playerId,
			badgeId: data.badgeId,
			gameTopicId: data.gameTopicId ?? null,
			gameQuestionId: data.gameQuestionId ?? null,
			earnedAt: data.earnedAt ?? new Date(),
		},
		select: { id: true },
	});
}
