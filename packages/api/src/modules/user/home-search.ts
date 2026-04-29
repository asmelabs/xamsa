import type { Prisma } from "@xamsa/db";
import prisma from "@xamsa/db";
import type {
	HomeSearchInputType,
	HomeSearchItemType,
	HomeSearchOutputType,
} from "@xamsa/schemas/modules/search";

const FETCH_PER_KIND = 3;

function visiblePackWhere(
	viewerUserId: string | undefined,
): Prisma.PackWhereInput {
	if (viewerUserId) {
		return {
			OR: [
				{
					AND: [{ status: "published" }, { visibility: "public" }],
				},
				{ authorId: viewerUserId },
			],
		};
	}
	return { AND: [{ status: "published" }, { visibility: "public" }] };
}

function interleave(
	users: HomeSearchItemType[],
	packs: HomeSearchItemType[],
	topics: HomeSearchItemType[],
	games: HomeSearchItemType[],
	max: number,
): HomeSearchItemType[] {
	const buckets = [users, packs, topics, games];
	const out: HomeSearchItemType[] = [];
	let round = 0;
	while (out.length < max) {
		let addedThisRound = false;
		for (const b of buckets) {
			if (out.length >= max) break;
			const item = b[round];
			if (item !== undefined) {
				out.push(item);
				addedThisRound = true;
			}
		}
		if (!addedThisRound) break;
		round++;
	}
	return out;
}

export async function homeSearch(
	input: HomeSearchInputType,
	viewerUserId: string | undefined,
): Promise<HomeSearchOutputType> {
	const q = input.query.trim();
	const limit = input.limit;
	if (q.length < 1) {
		return { items: [] };
	}

	const packWhere = visiblePackWhere(viewerUserId);
	const textOr = [
		{ name: { contains: q, mode: "insensitive" as const } },
		{ username: { contains: q, mode: "insensitive" as const } },
	];

	const [userRows, packRows, topicRows, gameRows] = await Promise.all([
		prisma.user.findMany({
			where: {
				AND: [
					{ OR: textOr },
					...(viewerUserId ? [{ NOT: { id: viewerUserId } }] : []),
				],
			},
			take: FETCH_PER_KIND,
			orderBy: { username: "asc" },
			select: { username: true, name: true },
		}),
		prisma.pack.findMany({
			where: {
				AND: [
					packWhere,
					{
						OR: [
							{ name: { contains: q, mode: "insensitive" } },
							{ description: { contains: q, mode: "insensitive" } },
						],
					},
				],
			},
			take: FETCH_PER_KIND,
			orderBy: { slug: "asc" },
			select: { slug: true, name: true, description: true },
		}),
		prisma.topic.findMany({
			where: {
				AND: [
					{
						pack: { is: packWhere },
					},
					{
						OR: [
							{ name: { contains: q, mode: "insensitive" } },
							{ description: { contains: q, mode: "insensitive" } },
						],
					},
				],
			},
			take: FETCH_PER_KIND,
			orderBy: [{ packId: "asc" }, { order: "asc" }],
			select: {
				slug: true,
				name: true,
				description: true,
				pack: { select: { slug: true } },
			},
		}),
		prisma.game.findMany({
			where: { code: { contains: q, mode: "insensitive" } },
			take: FETCH_PER_KIND,
			orderBy: { code: "asc" },
			select: { code: true, pack: { select: { name: true } } },
		}),
	]);

	const users: HomeSearchItemType[] = userRows.map((r) => ({
		kind: "user" as const,
		username: r.username,
		title: r.name,
		description: `@${r.username}`,
	}));

	const packs: HomeSearchItemType[] = packRows.map((r) => ({
		kind: "pack" as const,
		slug: r.slug,
		title: r.name,
		description: r.description,
	}));

	const topics: HomeSearchItemType[] = topicRows.map((r) => ({
		kind: "topic" as const,
		packSlug: r.pack.slug,
		topicSlug: r.slug,
		title: r.name,
		description: r.description,
	}));

	const games: HomeSearchItemType[] = gameRows.map((r) => ({
		kind: "game" as const,
		code: r.code,
		title: r.code,
		description: r.pack.name,
	}));

	return {
		items: interleave(users, packs, topics, games, limit),
	};
}
