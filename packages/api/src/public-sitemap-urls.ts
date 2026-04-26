import prisma from "@xamsa/db";

const BATCH = 3000;

export const PUBLIC_SITEMAP_STATIC_PATHS = [
	"/",
	"/packs/",
	"/leaderboard/",
	"/whats-new/",
	"/games/history/",
	"/play/",
] as const;

export type PublicSitemapEntry = {
	path: string;
	lastmod: Date;
};

const packWhere = {
	status: "published" as const,
	visibility: "public" as const,
};

function maxDate(a: Date, b: Date): Date {
	return a.getTime() >= b.getTime() ? a : b;
}

async function collectPackEntries(): Promise<PublicSitemapEntry[]> {
	const out: PublicSitemapEntry[] = [];
	let cursor: { id: string } | undefined;

	for (;;) {
		const rows = await prisma.pack.findMany({
			where: packWhere,
			select: {
				id: true,
				slug: true,
				updatedAt: true,
				publishedAt: true,
			},
			orderBy: { id: "asc" },
			take: BATCH,
			...(cursor ? { skip: 1, cursor: { id: cursor.id } } : {}),
		});

		if (rows.length === 0) {
			break;
		}

		for (const row of rows) {
			const lastmod = row.publishedAt
				? maxDate(row.updatedAt, row.publishedAt)
				: row.updatedAt;
			out.push({
				path: `/packs/${row.slug}/`,
				lastmod,
			});
		}

		const last = rows[rows.length - 1];
		if (!last) {
			break;
		}
		cursor = { id: last.id };
		if (rows.length < BATCH) {
			break;
		}
	}

	return out;
}

async function collectTopicEntries(): Promise<PublicSitemapEntry[]> {
	const out: PublicSitemapEntry[] = [];
	let cursor: { id: string } | undefined;

	for (;;) {
		const rows = await prisma.topic.findMany({
			where: { pack: packWhere },
			select: {
				id: true,
				slug: true,
				updatedAt: true,
				pack: { select: { slug: true } },
			},
			orderBy: { id: "asc" },
			take: BATCH,
			...(cursor ? { skip: 1, cursor: { id: cursor.id } } : {}),
		});

		if (rows.length === 0) {
			break;
		}

		for (const row of rows) {
			out.push({
				path: `/packs/${row.pack.slug}/topics/${row.slug}/`,
				lastmod: row.updatedAt,
			});
		}

		const last = rows[rows.length - 1];
		if (!last) {
			break;
		}
		cursor = { id: last.id };
		if (rows.length < BATCH) {
			break;
		}
	}

	return out;
}

async function collectUserEntries(): Promise<PublicSitemapEntry[]> {
	const out: PublicSitemapEntry[] = [];
	let cursor: { id: string } | undefined;

	for (;;) {
		const rows = await prisma.user.findMany({
			select: { id: true, username: true, updatedAt: true },
			orderBy: { id: "asc" },
			take: BATCH,
			...(cursor ? { skip: 1, cursor: { id: cursor.id } } : {}),
		});

		if (rows.length === 0) {
			break;
		}

		for (const row of rows) {
			out.push({ path: `/u/${row.username}/`, lastmod: row.updatedAt });
		}

		const last = rows[rows.length - 1];
		if (!last) {
			break;
		}
		cursor = { id: last.id };
		if (rows.length < BATCH) {
			break;
		}
	}

	return out;
}

/**
 * All indexable paths for the public sitemap: static marketing URLs plus
 * published public packs, their topics, and public user profile URLs.
 */
export async function getPublicSitemapEntries(): Promise<PublicSitemapEntry[]> {
	const now = new Date();
	const staticEntries: PublicSitemapEntry[] = PUBLIC_SITEMAP_STATIC_PATHS.map(
		(path) => ({ path, lastmod: now }),
	);

	const [packs, topics, users] = await Promise.all([
		collectPackEntries(),
		collectTopicEntries(),
		collectUserEntries(),
	]);

	return [...staticEntries, ...packs, ...topics, ...users];
}
