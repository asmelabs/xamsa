import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	FindOneProfileInputType,
	FindOneProfileOutputType,
	GetActiveGameOutputType,
	GetMyStatsOutputType,
	GetPublicRecentGamesInputType,
	GetPublicRecentGamesOutputType,
	GetPublicStatsInputType,
	GetPublicStatsOutputType,
	GetRecentGamesInputType,
	GetRecentGamesOutputType,
	RecentGameRow,
	UpdateProfileInputType,
	UpdateProfileOutputType,
} from "@xamsa/schemas/modules/user";

export async function findOneProfile(
	input: FindOneProfileInputType,
): Promise<FindOneProfileOutputType> {
	const profile = await prisma.user.findUnique({
		where: {
			username: input.username,
		},
		select: {
			username: true,
			name: true,
			image: true,
			role: true,
			xp: true,
			level: true,
			elo: true,
			peakElo: true,
			lowestElo: true,
		},
	});

	if (!profile) {
		throw new ORPCError("NOT_FOUND", {
			message: "Profile not found",
		});
	}

	return profile;
}

export async function updateProfile(
	input: UpdateProfileInputType,
	userId: string,
): Promise<UpdateProfileOutputType> {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "You are not authorized to update this profile",
		});
	}

	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data: input,
		select: {
			username: true,
		},
	});

	return updatedUser;
}

export async function getActiveGame(
	userId: string,
): Promise<GetActiveGameOutputType | null> {
	const activeGame = await prisma.game.findFirst({
		where: {
			status: { not: "completed" }, // only active or waiting games
			OR: [
				{ hostId: userId },
				{
					players: {
						some: { userId, status: { not: "left" } },
					},
				},
			],
		},
		select: {
			code: true,
			status: true,
			host: {
				select: {
					id: true,
				},
			},
			players: {
				where: {
					userId,
				},
				select: {
					id: true,
					nickname: true,
					score: true,
					rank: true,
					userId: true,
					status: true,
				},
			},
		},
	});

	if (!activeGame) return null;

	const { code, host, players, status } = activeGame;

	const player = players.find((player) => player.userId === userId);
	const isHost = host.id === userId;

	if (isHost) {
		return {
			code,
			status,
			isHost,
		};
	}

	if (player) {
		return {
			code,
			status,
			isHost: false,
			player: {
				status: player.status,
				nickname: player.nickname,
				score: player.score,
				rank: player.rank,
			},
		};
	}

	throw new ORPCError("INTERNAL_SERVER_ERROR", {
		message: "Something went wrong while fetching your active game",
	});
}

/**
 * Returns the handful of user-level aggregates rendered on the home
 * dashboard stats strip. Separated from `findOneProfile` so public profile
 * payloads stay lean.
 */
export async function getMyStats(
	userId: string,
): Promise<GetMyStatsOutputType> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			level: true,
			xp: true,
			totalGamesPlayed: true,
			totalGamesHosted: true,
			totalWins: true,
			totalPodiums: true,
			totalPointsEarned: true,
			totalCorrectAnswers: true,
		},
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
		});
	}

	return user;
}

/**
 * Returns the signed-in user's recent finished games (both as host and as
 * player), ordered by finishedAt desc. Cursor pagination uses the Game.id of
 * the last row from the previous page; we fetch `limit + 1` and use the
 * extra row to compute `nextCursor`.
 *
 * Only `status: "completed"` games with a non-null `finishedAt` and a
 * non-null `startedAt` surface — i.e. sessions that actually started. Lobby
 * cancels (completed without `startedAt`) are excluded, along with anything
 * still active, deleted, or never finalized.
 */
export async function getRecentGames(
	input: GetRecentGamesInputType,
	userId: string,
): Promise<GetRecentGamesOutputType> {
	const limit = input.limit;

	const rows = await prisma.game.findMany({
		where: {
			status: "completed",
			finishedAt: { not: null },
			startedAt: { not: null },
			OR: [{ hostId: userId }, { players: { some: { userId } } }],
		},
		orderBy: [{ finishedAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		select: {
			id: true,
			code: true,
			finishedAt: true,
			durationSeconds: true,
			hostId: true,
			winnerId: true,
			pack: { select: { slug: true, name: true } },
			players: {
				select: {
					id: true,
					userId: true,
					rank: true,
					score: true,
					user: { select: { name: true } },
				},
			},
		},
	});

	const hasNext = rows.length > limit;
	const pageRows = hasNext ? rows.slice(0, limit) : rows;

	const items: RecentGameRow[] = pageRows.map((game) => {
		const isHost = game.hostId === userId;
		const me = game.players.find((p) => p.userId === userId) ?? null;
		const winner = game.winnerId
			? (game.players.find((p) => p.id === game.winnerId) ?? null)
			: null;

		return {
			code: game.code,
			finishedAt: game.finishedAt as Date,
			durationSeconds: game.durationSeconds,
			pack: game.pack,
			totalPlayers: game.players.length,
			role: isHost ? "host" : "player",
			myRank: me?.rank ?? null,
			myScore: me?.score,
			winnerName: winner?.user.name ?? null,
		};
	});

	const nextCursor =
		hasNext && pageRows.length > 0
			? (pageRows[pageRows.length - 1]?.id ?? null)
			: null;

	return { items, nextCursor };
}

async function requireUserIdByUsername(username: string): Promise<string> {
	const user = await prisma.user.findUnique({
		where: { username },
		select: { id: true },
	});
	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "Profile not found",
		});
	}
	return user.id;
}

export async function getPublicStats(
	input: GetPublicStatsInputType,
): Promise<GetPublicStatsOutputType> {
	const userId = await requireUserIdByUsername(input.username);
	return getMyStats(userId);
}

export async function getPublicRecentGames(
	input: GetPublicRecentGamesInputType,
): Promise<GetPublicRecentGamesOutputType> {
	const { username, ...pagination } = input;
	const userId = await requireUserIdByUsername(username);
	return getRecentGames(pagination, userId);
}
