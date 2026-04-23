import { ORPCError } from "@orpc/server";
import type { Prisma } from "@xamsa/db";
import prisma from "@xamsa/db";
import type {
	GetGlobalLeaderboardInputType,
	GetGlobalLeaderboardOutputType,
	GlobalLeaderboardBoardType,
	GlobalLeaderboardRowType,
} from "@xamsa/schemas/modules/user";

/** Minimum completed games as a player for Elo board (competitive play only). */
const MIN_GAMES_PLAYED_ELO = 1;

const CURSOR_VERSION = 1 as const;

type EloCursor = {
	v: typeof CURSOR_VERSION;
	b: "elo";
	elo: number;
	peakElo: number;
	totalWins: number;
	username: string;
};

type XpCursor = {
	v: typeof CURSOR_VERSION;
	b: "xp";
	xp: number;
	level: number;
	totalWins: number;
	username: string;
};

type WinsCursor = {
	v: typeof CURSOR_VERSION;
	b: "wins";
	totalWins: number;
	totalGamesPlayed: number;
	elo: number;
	username: string;
};

type PointsCursor = {
	v: typeof CURSOR_VERSION;
	b: "points";
	totalPointsEarned: number;
	totalWins: number;
	username: string;
};

type LeaderboardCursor = EloCursor | XpCursor | WinsCursor | PointsCursor;

function encodeCursor(cursor: LeaderboardCursor): string {
	return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(
	raw: string,
	board: GlobalLeaderboardBoardType,
): LeaderboardCursor {
	let parsed: unknown;
	try {
		parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
	} catch {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid leaderboard cursor",
		});
	}
	if (!parsed || typeof parsed !== "object") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid leaderboard cursor",
		});
	}
	const c = parsed as Record<string, unknown>;
	if (c.v !== CURSOR_VERSION || c.b !== board) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid leaderboard cursor",
		});
	}
	switch (board) {
		case "elo":
			if (
				typeof c.elo !== "number" ||
				typeof c.peakElo !== "number" ||
				typeof c.totalWins !== "number" ||
				typeof c.username !== "string"
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Invalid leaderboard cursor",
				});
			}
			return {
				v: CURSOR_VERSION,
				b: "elo",
				elo: c.elo,
				peakElo: c.peakElo,
				totalWins: c.totalWins,
				username: c.username,
			};
		case "xp":
			if (
				typeof c.xp !== "number" ||
				typeof c.level !== "number" ||
				typeof c.totalWins !== "number" ||
				typeof c.username !== "string"
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Invalid leaderboard cursor",
				});
			}
			return {
				v: CURSOR_VERSION,
				b: "xp",
				xp: c.xp,
				level: c.level,
				totalWins: c.totalWins,
				username: c.username,
			};
		case "wins":
			if (
				typeof c.totalWins !== "number" ||
				typeof c.totalGamesPlayed !== "number" ||
				typeof c.elo !== "number" ||
				typeof c.username !== "string"
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Invalid leaderboard cursor",
				});
			}
			return {
				v: CURSOR_VERSION,
				b: "wins",
				totalWins: c.totalWins,
				totalGamesPlayed: c.totalGamesPlayed,
				elo: c.elo,
				username: c.username,
			};
		case "points":
			if (
				typeof c.totalPointsEarned !== "number" ||
				typeof c.totalWins !== "number" ||
				typeof c.username !== "string"
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Invalid leaderboard cursor",
				});
			}
			return {
				v: CURSOR_VERSION,
				b: "points",
				totalPointsEarned: c.totalPointsEarned,
				totalWins: c.totalWins,
				username: c.username,
			};
		default:
			throw new ORPCError("BAD_REQUEST", {
				message: "Invalid leaderboard cursor",
			});
	}
}

function rowToCursor(
	board: GlobalLeaderboardBoardType,
	row: {
		username: string;
		elo: number;
		peakElo: number;
		xp: number;
		level: number;
		totalWins: number;
		totalGamesPlayed: number;
		totalPointsEarned: number;
	},
): LeaderboardCursor {
	switch (board) {
		case "elo":
			return {
				v: CURSOR_VERSION,
				b: "elo",
				elo: row.elo,
				peakElo: row.peakElo,
				totalWins: row.totalWins,
				username: row.username,
			};
		case "xp":
			return {
				v: CURSOR_VERSION,
				b: "xp",
				xp: row.xp,
				level: row.level,
				totalWins: row.totalWins,
				username: row.username,
			};
		case "wins":
			return {
				v: CURSOR_VERSION,
				b: "wins",
				totalWins: row.totalWins,
				totalGamesPlayed: row.totalGamesPlayed,
				elo: row.elo,
				username: row.username,
			};
		case "points":
			return {
				v: CURSOR_VERSION,
				b: "points",
				totalPointsEarned: row.totalPointsEarned,
				totalWins: row.totalWins,
				username: row.username,
			};
	}
}

function strictlyBetterWhere(cursor: LeaderboardCursor): Prisma.UserWhereInput {
	switch (cursor.b) {
		case "elo":
			return {
				OR: [
					{ elo: { gt: cursor.elo } },
					{
						AND: [{ elo: cursor.elo }, { peakElo: { gt: cursor.peakElo } }],
					},
					{
						AND: [
							{ elo: cursor.elo },
							{ peakElo: cursor.peakElo },
							{ totalWins: { gt: cursor.totalWins } },
						],
					},
					{
						AND: [
							{ elo: cursor.elo },
							{ peakElo: cursor.peakElo },
							{ totalWins: cursor.totalWins },
							{ username: { lt: cursor.username } },
						],
					},
				],
			};
		case "xp":
			return {
				OR: [
					{ xp: { gt: cursor.xp } },
					{
						AND: [{ xp: cursor.xp }, { level: { gt: cursor.level } }],
					},
					{
						AND: [
							{ xp: cursor.xp },
							{ level: cursor.level },
							{ totalWins: { gt: cursor.totalWins } },
						],
					},
					{
						AND: [
							{ xp: cursor.xp },
							{ level: cursor.level },
							{ totalWins: cursor.totalWins },
							{ username: { lt: cursor.username } },
						],
					},
				],
			};
		case "wins":
			return {
				OR: [
					{ totalWins: { gt: cursor.totalWins } },
					{
						AND: [
							{ totalWins: cursor.totalWins },
							{ totalGamesPlayed: { gt: cursor.totalGamesPlayed } },
						],
					},
					{
						AND: [
							{ totalWins: cursor.totalWins },
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ elo: { gt: cursor.elo } },
						],
					},
					{
						AND: [
							{ totalWins: cursor.totalWins },
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ elo: cursor.elo },
							{ username: { lt: cursor.username } },
						],
					},
				],
			};
		case "points":
			return {
				OR: [
					{ totalPointsEarned: { gt: cursor.totalPointsEarned } },
					{
						AND: [
							{ totalPointsEarned: cursor.totalPointsEarned },
							{ totalWins: { gt: cursor.totalWins } },
						],
					},
					{
						AND: [
							{ totalPointsEarned: cursor.totalPointsEarned },
							{ totalWins: cursor.totalWins },
							{ username: { lt: cursor.username } },
						],
					},
				],
			};
	}
}

function strictlyAfterWhere(cursor: LeaderboardCursor): Prisma.UserWhereInput {
	switch (cursor.b) {
		case "elo":
			return {
				OR: [
					{ elo: { lt: cursor.elo } },
					{
						AND: [{ elo: cursor.elo }, { peakElo: { lt: cursor.peakElo } }],
					},
					{
						AND: [
							{ elo: cursor.elo },
							{ peakElo: cursor.peakElo },
							{ totalWins: { lt: cursor.totalWins } },
						],
					},
					{
						AND: [
							{ elo: cursor.elo },
							{ peakElo: cursor.peakElo },
							{ totalWins: cursor.totalWins },
							{ username: { gt: cursor.username } },
						],
					},
				],
			};
		case "xp":
			return {
				OR: [
					{ xp: { lt: cursor.xp } },
					{
						AND: [{ xp: cursor.xp }, { level: { lt: cursor.level } }],
					},
					{
						AND: [
							{ xp: cursor.xp },
							{ level: cursor.level },
							{ totalWins: { lt: cursor.totalWins } },
						],
					},
					{
						AND: [
							{ xp: cursor.xp },
							{ level: cursor.level },
							{ totalWins: cursor.totalWins },
							{ username: { gt: cursor.username } },
						],
					},
				],
			};
		case "wins":
			return {
				OR: [
					{ totalWins: { lt: cursor.totalWins } },
					{
						AND: [
							{ totalWins: cursor.totalWins },
							{ totalGamesPlayed: { lt: cursor.totalGamesPlayed } },
						],
					},
					{
						AND: [
							{ totalWins: cursor.totalWins },
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ elo: { lt: cursor.elo } },
						],
					},
					{
						AND: [
							{ totalWins: cursor.totalWins },
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ elo: cursor.elo },
							{ username: { gt: cursor.username } },
						],
					},
				],
			};
		case "points":
			return {
				OR: [
					{ totalPointsEarned: { lt: cursor.totalPointsEarned } },
					{
						AND: [
							{ totalPointsEarned: cursor.totalPointsEarned },
							{ totalWins: { lt: cursor.totalWins } },
						],
					},
					{
						AND: [
							{ totalPointsEarned: cursor.totalPointsEarned },
							{ totalWins: cursor.totalWins },
							{ username: { gt: cursor.username } },
						],
					},
				],
			};
	}
}

function baseWhereForBoard(
	board: GlobalLeaderboardBoardType,
): Prisma.UserWhereInput {
	if (board === "elo") {
		return { totalGamesPlayed: { gte: MIN_GAMES_PLAYED_ELO } };
	}
	// XP / wins / points: include active hosts who may have zero `totalGamesPlayed`
	return {
		OR: [{ totalGamesPlayed: { gte: 1 } }, { totalGamesHosted: { gte: 1 } }],
	};
}

function orderByForBoard(
	board: GlobalLeaderboardBoardType,
): Prisma.UserOrderByWithRelationInput[] {
	switch (board) {
		case "elo":
			return [
				{ elo: "desc" },
				{ peakElo: "desc" },
				{ totalWins: "desc" },
				{ username: "asc" },
			];
		case "xp":
			return [
				{ xp: "desc" },
				{ level: "desc" },
				{ totalWins: "desc" },
				{ username: "asc" },
			];
		case "wins":
			return [
				{ totalWins: "desc" },
				{ totalGamesPlayed: "desc" },
				{ elo: "desc" },
				{ username: "asc" },
			];
		case "points":
			return [
				{ totalPointsEarned: "desc" },
				{ totalWins: "desc" },
				{ username: "asc" },
			];
	}
}

export async function getGlobalLeaderboard(
	input: GetGlobalLeaderboardInputType,
): Promise<GetGlobalLeaderboardOutputType> {
	const board = input.board;
	const limit = input.limit;

	const baseWhere = baseWhereForBoard(board);

	let cursorDecoded: LeaderboardCursor | null = null;
	if (input.cursor) {
		cursorDecoded = decodeCursor(input.cursor, board);
	}

	const where: Prisma.UserWhereInput = cursorDecoded
		? { AND: [baseWhere, strictlyAfterWhere(cursorDecoded)] }
		: baseWhere;

	const startRank =
		cursorDecoded === null
			? 1
			: (await prisma.user.count({
					where: { AND: [baseWhere, strictlyBetterWhere(cursorDecoded)] },
				})) + 1;

	const rows = await prisma.user.findMany({
		where,
		orderBy: orderByForBoard(board),
		take: limit + 1,
		select: {
			username: true,
			name: true,
			image: true,
			elo: true,
			peakElo: true,
			level: true,
			xp: true,
			totalWins: true,
			totalGamesPlayed: true,
			totalPointsEarned: true,
		},
	});

	const hasNext = rows.length > limit;
	const pageRows = hasNext ? rows.slice(0, limit) : rows;

	const items: GlobalLeaderboardRowType[] = pageRows.map((row, i) => ({
		rank: startRank + i,
		username: row.username,
		name: row.name,
		image: row.image,
		elo: row.elo,
		level: row.level,
		xp: row.xp,
		totalWins: row.totalWins,
		totalGamesPlayed: row.totalGamesPlayed,
		totalPointsEarned: row.totalPointsEarned,
	}));

	const last = pageRows[pageRows.length - 1];
	const nextCursor =
		hasNext && last
			? encodeCursor(
					rowToCursor(board, {
						username: last.username,
						elo: last.elo,
						peakElo: last.peakElo,
						xp: last.xp,
						level: last.level,
						totalWins: last.totalWins,
						totalGamesPlayed: last.totalGamesPlayed,
						totalPointsEarned: last.totalPointsEarned,
					}),
				)
			: null;

	return { items, nextCursor };
}
