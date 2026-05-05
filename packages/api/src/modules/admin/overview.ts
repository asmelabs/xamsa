import prisma from "@xamsa/db";
import type { GetAdminOverviewOutputType } from "@xamsa/schemas/modules/admin";

const RECENT_DAYS = 7;
const ACTIVITY_DAYS = 14;

function startOfUtcDay(date: Date): Date {
	return new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			0,
			0,
			0,
			0,
		),
	);
}

/**
 * Aggregate site-wide stats for the staff dashboard overview. Runs every
 * counter and grouped query in parallel; per-row queries (top creators,
 * top players, recent games) reuse already-paginated friendly cursors.
 */
export async function getAdminOverview(): Promise<GetAdminOverviewOutputType> {
	const now = new Date();
	const recentFrom = new Date(
		now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000,
	);
	const activityFrom = startOfUtcDay(
		new Date(now.getTime() - (ACTIVITY_DAYS - 1) * 24 * 60 * 60 * 1000),
	);

	const [
		totalUsers,
		totalPacks,
		totalTopics,
		totalQuestions,
		totalGames,
		totalPosts,
		totalComments,
		totalReactions,
		totalClicks,
		totalBadgeAwards,
		recentUsers,
		recentGames,
		recentPosts,
		recentComments,
		recentBadgeAwards,
		topCreatorsRaw,
		topPlayersRaw,
		recentGameRowsRaw,
		gamesActivityRaw,
		usersActivityRaw,
		postsActivityRaw,
		topicBulkPending,
		topicBulkRunning,
		topicBulkFailed24h,
		roleGroups,
	] = await Promise.all([
		prisma.user.count(),
		prisma.pack.count(),
		prisma.topic.count(),
		prisma.question.count(),
		prisma.game.count(),
		prisma.post.count(),
		prisma.comment.count(),
		prisma.reaction.count(),
		prisma.click.count(),
		prisma.playerBadgeAward.count(),
		prisma.user.count({ where: { createdAt: { gte: recentFrom } } }),
		prisma.game.count({
			where: { status: "completed", finishedAt: { gte: recentFrom } },
		}),
		prisma.post.count({ where: { createdAt: { gte: recentFrom } } }),
		prisma.comment.count({ where: { createdAt: { gte: recentFrom } } }),
		prisma.playerBadgeAward.count({
			where: { earnedAt: { gte: recentFrom } },
		}),
		prisma.user.findMany({
			where: { packs: { some: { status: "published" } } },
			orderBy: [{ totalGamesHosted: "desc" }, { username: "asc" }],
			take: 5,
			select: {
				username: true,
				name: true,
				image: true,
				_count: {
					select: { packs: { where: { status: "published" } } },
				},
				packs: {
					where: { status: "published" },
					select: { totalPlays: true },
				},
			},
		}),
		prisma.user.findMany({
			where: { totalGamesPlayed: { gte: 1 } },
			orderBy: [{ elo: "desc" }, { totalWins: "desc" }, { username: "asc" }],
			take: 5,
			select: {
				username: true,
				name: true,
				image: true,
				elo: true,
				totalWins: true,
			},
		}),
		prisma.game.findMany({
			where: { status: "completed", finishedAt: { not: null } },
			orderBy: { finishedAt: "desc" },
			take: 5,
			select: {
				id: true,
				finishedAt: true,
				host: {
					select: { username: true, name: true },
				},
				pack: { select: { name: true } },
				_count: { select: { players: true } },
				players: {
					where: { rank: 1 },
					take: 1,
					select: {
						user: { select: { username: true } },
					},
				},
			},
		}),
		prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
			SELECT date_trunc('day', "finished_at") AS day, COUNT(*)::bigint AS n
			FROM "game"
			WHERE "status" = 'completed' AND "finished_at" >= ${activityFrom}
			GROUP BY day
			ORDER BY day ASC
		`,
		prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
			SELECT date_trunc('day', "created_at") AS day, COUNT(*)::bigint AS n
			FROM "user"
			WHERE "created_at" >= ${activityFrom}
			GROUP BY day
			ORDER BY day ASC
		`,
		prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
			SELECT date_trunc('day', "created_at") AS day, COUNT(*)::bigint AS n
			FROM "post"
			WHERE "created_at" >= ${activityFrom}
			GROUP BY day
			ORDER BY day ASC
		`,
		prisma.topicBulkJob.count({ where: { status: "pending" } }),
		prisma.topicBulkJob.count({ where: { status: "running" } }),
		prisma.topicBulkJob.count({
			where: {
				status: "failed",
				updatedAt: {
					gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
				},
			},
		}),
		prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
	]);

	const topCreators = topCreatorsRaw
		.map((u) => ({
			username: u.username,
			name: u.name,
			image: u.image,
			publishedPacks: u._count.packs,
			totalPlays: u.packs.reduce((acc, p) => acc + p.totalPlays, 0),
		}))
		.sort((a, b) => {
			if (b.totalPlays !== a.totalPlays) return b.totalPlays - a.totalPlays;
			return b.publishedPacks - a.publishedPacks;
		})
		.slice(0, 5);

	const topPlayers = topPlayersRaw.map((u) => ({
		username: u.username,
		name: u.name,
		image: u.image,
		elo: u.elo,
		totalWins: u.totalWins,
	}));

	const recentGameRows = recentGameRowsRaw
		.filter((g) => g.finishedAt !== null)
		.map((g) => ({
			id: g.id,
			// finishedAt is non-null per filter above.
			finishedAt: g.finishedAt as Date,
			hostUsername: g.host.username,
			hostName: g.host.name,
			packName: g.pack?.name ?? null,
			playerCount: g._count.players,
			winnerUsername: g.players[0]?.user?.username ?? null,
		}));

	// Build a 14-day grid keyed by ISO date so missing days show as zeros.
	const dateKey = (d: Date): string => d.toISOString().slice(0, 10);
	const gamesByDay = new Map<string, number>();
	for (const row of gamesActivityRaw) {
		gamesByDay.set(dateKey(row.day), Number(row.n));
	}
	const usersByDay = new Map<string, number>();
	for (const row of usersActivityRaw) {
		usersByDay.set(dateKey(row.day), Number(row.n));
	}
	const postsByDay = new Map<string, number>();
	for (const row of postsActivityRaw) {
		postsByDay.set(dateKey(row.day), Number(row.n));
	}

	const activity14d: GetAdminOverviewOutputType["activity14d"] = [];
	for (let i = 0; i < ACTIVITY_DAYS; i++) {
		const d = new Date(activityFrom.getTime() + i * 24 * 60 * 60 * 1000);
		const k = dateKey(d);
		activity14d.push({
			date: k,
			games: gamesByDay.get(k) ?? 0,
			users: usersByDay.get(k) ?? 0,
			posts: postsByDay.get(k) ?? 0,
		});
	}

	return {
		totals: {
			users: totalUsers,
			packs: totalPacks,
			topics: totalTopics,
			questions: totalQuestions,
			games: totalGames,
			posts: totalPosts,
			comments: totalComments,
			reactions: totalReactions,
			clicks: totalClicks,
			badgeAwards: totalBadgeAwards,
		},
		recent7d: {
			users: recentUsers,
			games: recentGames,
			posts: recentPosts,
			comments: recentComments,
			badgeAwards: recentBadgeAwards,
		},
		topCreators,
		topPlayers,
		recentGames: recentGameRows,
		activity14d,
		jobs: {
			topicBulkPending,
			topicBulkRunning,
			topicBulkFailed24h,
		},
		roles: roleGroups.map((r) => ({
			role: r.role,
			count: r._count._all,
		})),
	};
}
