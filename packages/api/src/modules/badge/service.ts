import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	FindBadgeAwardInputType,
	FindBadgeAwardOutputType,
	GetBadgeCatalogStatsOutputType,
	GetPublicBadgeSummaryByUsernameInputType,
	GetPublicBadgeSummaryByUsernameOutputType,
	ListBadgeEarnersInputType,
	ListBadgeEarnersOutputType,
	ListPublicAwardsByUsernameInputType,
	ListPublicAwardsByUsernameOutputType,
} from "@xamsa/schemas/modules/badge";
import { type BadgeId, isBadgeId } from "@xamsa/utils/badges";
import { defineCursorPagination } from "@xamsa/utils/pagination";

import { requireUserIdByUsername } from "../user/service";

const BADGE_EARNER_SELECT = {
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
} as const;

function mapBadgeSelectRow(row: {
	id: string;
	badgeId: string;
	earnedAt: Date;
	gameTopic: {
		order: number;
		topic: { slug: string; name: string };
	} | null;
	gameQuestion: {
		order: number;
		gameTopic: {
			order: number;
			topic: { slug: string; name: string };
		};
	} | null;
	player: {
		user: { username: string; name: string | null; image: string | null };
		game: { code: string; pack: { slug: string; name: string } };
	};
}): ListBadgeEarnersOutputType["items"][number] | null {
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

	if (!isBadgeId(row.badgeId)) return null;

	return {
		id: row.id,
		badgeId: row.badgeId as BadgeId,
		earnedAt: row.earnedAt,
		user: {
			...row.player.user,
			name: row.player.user.name ?? "",
		},
		game: row.player.game,
		topic,
		questionOrder: gq?.order ?? null,
	};
}

export async function listBadgeEarners(
	input: ListBadgeEarnersInputType,
): Promise<ListBadgeEarnersOutputType> {
	const pag = defineCursorPagination(input, input.limit);
	const cursorArgs = pag.use("id");

	const earnedAtFilter: { gte?: Date; lte?: Date } = {};
	if (input.from) earnedAtFilter.gte = input.from;
	if (input.to) earnedAtFilter.lte = input.to;
	const playerFilter: Prisma.PlayerWhereInput = {};
	if (input.username) {
		playerFilter.user = {
			username: { contains: input.username, mode: "insensitive" },
		};
	}
	if (input.gameCode) {
		playerFilter.game = { code: input.gameCode };
	}

	const where: Prisma.PlayerBadgeAwardWhereInput = { badgeId: input.badgeId };
	if (Object.keys(earnedAtFilter).length > 0) where.earnedAt = earnedAtFilter;
	if (Object.keys(playerFilter).length > 0) where.player = playerFilter;

	const raw = await prisma.playerBadgeAward.findMany({
		where,
		...cursorArgs,
		orderBy: [{ earnedAt: "desc" }, { id: "desc" }],
		select: BADGE_EARNER_SELECT,
	});

	const items = raw
		.map((row) => mapBadgeSelectRow(row))
		.filter((r): r is NonNullable<typeof r> => r !== null);

	return pag.output(items, (r) => r.id);
}

export async function listPublicAwardsByUsername(
	input: ListPublicAwardsByUsernameInputType,
): Promise<ListPublicAwardsByUsernameOutputType> {
	const userId = await requireUserIdByUsername(input.username);
	const pag = defineCursorPagination(input, input.limit);
	const cursorArgs = pag.use("id");

	const raw = await prisma.playerBadgeAward.findMany({
		where: {
			player: { userId },
			...(input.badgeId != null ? { badgeId: input.badgeId } : {}),
		},
		...cursorArgs,
		orderBy: [{ earnedAt: "desc" }, { id: "desc" }],
		select: BADGE_EARNER_SELECT,
	});

	const items = raw
		.map((row) => mapBadgeSelectRow(row))
		.filter((r): r is NonNullable<typeof r> => r !== null);

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

/**
 * Catalog stats: total awards + unique earners per badge id. Used by the
 * /badges directory's "Total earns" / "Unique earners" sort columns. Two
 * cheap queries — a `groupBy` for total + a raw count(distinct user_id) for
 * uniques. Cached client-side; no live updates needed.
 */
export async function getBadgeCatalogStats(): Promise<GetBadgeCatalogStatsOutputType> {
	const [totals, uniques, totalEligibleUsers] = await Promise.all([
		prisma.playerBadgeAward.groupBy({
			by: ["badgeId"],
			_count: { _all: true },
		}),
		prisma.$queryRaw<{ badgeId: string; uniqueUsers: bigint }[]>`
			SELECT pba.badge_id AS "badgeId",
			       COUNT(DISTINCT p.user_id) AS "uniqueUsers"
			FROM player_badge_award pba
			JOIN player p ON p.id = pba.player_id
			GROUP BY pba.badge_id
		`,
		prisma.user.count({ where: { totalGamesPlayed: { gt: 0 } } }),
	]);

	const totalById = new Map<string, number>();
	for (const t of totals) totalById.set(t.badgeId, t._count._all);

	const uniqueById = new Map<string, number>();
	for (const u of uniques) uniqueById.set(u.badgeId, Number(u.uniqueUsers));

	const ids = new Set<string>([...totalById.keys(), ...uniqueById.keys()]);

	const rows: GetBadgeCatalogStatsOutputType["rows"] = [];
	for (const id of ids) {
		if (!isBadgeId(id)) continue;
		rows.push({
			badgeId: id as BadgeId,
			totalEarns: totalById.get(id) ?? 0,
			uniqueEarners: uniqueById.get(id) ?? 0,
		});
	}

	return { rows, totalEligibleUsers };
}

/**
 * Single award by id. Used by the per-award share page and OG.
 */
export async function findBadgeAward(
	input: FindBadgeAwardInputType,
): Promise<FindBadgeAwardOutputType> {
	const row = await prisma.playerBadgeAward.findUnique({
		where: { id: input.awardId },
		select: BADGE_EARNER_SELECT,
	});

	const mapped = row ? mapBadgeSelectRow(row) : null;
	if (!mapped) {
		throw new ORPCError("NOT_FOUND", {
			message: "Badge award not found",
		});
	}
	return mapped;
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
