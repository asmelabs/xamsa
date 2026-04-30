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

type HostsCursor = {
	v: typeof CURSOR_VERSION;
	b: "hosts";
	totalGamesHosted: number;
	totalGamesPlayed: number;
	elo: number;
	username: string;
};

type PlaysCursor = {
	v: typeof CURSOR_VERSION;
	b: "plays";
	totalGamesPlayed: number;
	totalWins: number;
	elo: number;
	username: string;
};

type LeaderboardCursor =
	| EloCursor
	| XpCursor
	| WinsCursor
	| HostsCursor
	| PlaysCursor;

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
		case "hosts":
			if (
				typeof c.totalGamesHosted !== "number" ||
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
				b: "hosts",
				totalGamesHosted: c.totalGamesHosted,
				totalGamesPlayed: c.totalGamesPlayed,
				elo: c.elo,
				username: c.username,
			};
		case "plays":
			if (
				typeof c.totalGamesPlayed !== "number" ||
				typeof c.totalWins !== "number" ||
				typeof c.elo !== "number" ||
				typeof c.username !== "string"
			) {
				throw new ORPCError("BAD_REQUEST", {
					message: "Invalid leaderboard cursor",
				});
			}
			return {
				v: CURSOR_VERSION,
				b: "plays",
				totalGamesPlayed: c.totalGamesPlayed,
				totalWins: c.totalWins,
				elo: c.elo,
				username: c.username,
			};
		default:
			throw new ORPCError("BAD_REQUEST", {
				message: "Invalid leaderboard cursor",
			});
	}
}

type RowCursorFields = {
	username: string;
	elo: number;
	peakElo: number;
	xp: number;
	level: number;
	totalWins: number;
	totalGamesHosted: number;
	totalGamesPlayed: number;
	totalPointsEarned: number;
};

function rowToCursor(
	board: GlobalLeaderboardBoardType,
	row: RowCursorFields,
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
		case "hosts":
			return {
				v: CURSOR_VERSION,
				b: "hosts",
				totalGamesHosted: row.totalGamesHosted,
				totalGamesPlayed: row.totalGamesPlayed,
				elo: row.elo,
				username: row.username,
			};
		case "plays":
			return {
				v: CURSOR_VERSION,
				b: "plays",
				totalGamesPlayed: row.totalGamesPlayed,
				totalWins: row.totalWins,
				elo: row.elo,
				username: row.username,
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
		case "hosts":
			return {
				OR: [
					{ totalGamesHosted: { lt: cursor.totalGamesHosted } },
					{
						AND: [
							{ totalGamesHosted: cursor.totalGamesHosted },
							{ totalGamesPlayed: { lt: cursor.totalGamesPlayed } },
						],
					},
					{
						AND: [
							{ totalGamesHosted: cursor.totalGamesHosted },
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ elo: { lt: cursor.elo } },
						],
					},
					{
						AND: [
							{ totalGamesHosted: cursor.totalGamesHosted },
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ elo: cursor.elo },
							{ username: { gt: cursor.username } },
						],
					},
				],
			};
		case "plays":
			return {
				OR: [
					{ totalGamesPlayed: { lt: cursor.totalGamesPlayed } },
					{
						AND: [
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ totalWins: { lt: cursor.totalWins } },
						],
					},
					{
						AND: [
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ totalWins: cursor.totalWins },
							{ elo: { lt: cursor.elo } },
						],
					},
					{
						AND: [
							{ totalGamesPlayed: cursor.totalGamesPlayed },
							{ totalWins: cursor.totalWins },
							{ elo: cursor.elo },
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
	if (board === "hosts") {
		return { totalGamesHosted: { gte: 1 } };
	}
	if (board === "plays") {
		return { totalGamesPlayed: { gte: 1 } };
	}
	return {
		OR: [{ totalGamesPlayed: { gte: 1 } }, { totalGamesHosted: { gte: 1 } }],
	};
}

/** Serialized primary metric for competition rank (ties share rank). */
function rankPrimaryKey(
	board: GlobalLeaderboardBoardType,
	row: RowCursorFields,
): string {
	switch (board) {
		case "elo":
			return `elo:${row.elo}`;
		case "xp":
			return `xp:${row.xp}:${row.level}`;
		case "wins":
			return `wins:${row.totalWins}`;
		case "hosts":
			return `hosts:${row.totalGamesHosted}`;
		case "plays":
			return `plays:${row.totalGamesPlayed}`;
	}
}

/** Users strictly ahead on the board's displayed primary metric only. */
function primaryStrictlyBetterWhere(
	board: GlobalLeaderboardBoardType,
	row: RowCursorFields,
): Prisma.UserWhereInput {
	switch (board) {
		case "elo":
			return { elo: { gt: row.elo } };
		case "xp":
			return {
				OR: [
					{ xp: { gt: row.xp } },
					{ AND: [{ xp: row.xp }, { level: { gt: row.level } }] },
				],
			};
		case "wins":
			return { totalWins: { gt: row.totalWins } };
		case "hosts":
			return { totalGamesHosted: { gt: row.totalGamesHosted } };
		case "plays":
			return { totalGamesPlayed: { gt: row.totalGamesPlayed } };
	}
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
		case "hosts":
			return [
				{ totalGamesHosted: "desc" },
				{ totalGamesPlayed: "desc" },
				{ elo: "desc" },
				{ username: "asc" },
			];
		case "plays":
			return [
				{ totalGamesPlayed: "desc" },
				{ totalWins: "desc" },
				{ elo: "desc" },
				{ username: "asc" },
			];
	}
}

export async function getGlobalLeaderboard(
	input: GetGlobalLeaderboardInputType,
	viewerUserId: string | undefined,
): Promise<GetGlobalLeaderboardOutputType> {
	const board = input.board;
	const limit = input.limit;

	const boardBase = baseWhereForBoard(board);
	const followingFilter: Prisma.UserWhereInput | undefined =
		input.onlyFollowing && viewerUserId
			? {
					followers: { some: { followerId: viewerUserId } },
				}
			: undefined;

	const baseWhere: Prisma.UserWhereInput = followingFilter
		? { AND: [boardBase, followingFilter] }
		: boardBase;

	let cursorDecoded: LeaderboardCursor | null = null;
	if (input.cursor) {
		cursorDecoded = decodeCursor(input.cursor, board);
	}

	const where: Prisma.UserWhereInput = cursorDecoded
		? { AND: [baseWhere, strictlyAfterWhere(cursorDecoded)] }
		: baseWhere;

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
			totalGamesHosted: true,
			totalGamesPlayed: true,
			totalPointsEarned: true,
		},
	});

	const hasNext = rows.length > limit;
	const pageRows = hasNext ? rows.slice(0, limit) : rows;

	const rankCache = new Map<string, number>();
	const items: GlobalLeaderboardRowType[] = [];

	for (const row of pageRows) {
		const fields: RowCursorFields = {
			username: row.username,
			elo: row.elo,
			peakElo: row.peakElo,
			xp: row.xp,
			level: row.level,
			totalWins: row.totalWins,
			totalGamesHosted: row.totalGamesHosted,
			totalGamesPlayed: row.totalGamesPlayed,
			totalPointsEarned: row.totalPointsEarned,
		};
		const key = rankPrimaryKey(board, fields);
		let rank = rankCache.get(key);
		if (rank === undefined) {
			const ahead = await prisma.user.count({
				where: {
					AND: [baseWhere, primaryStrictlyBetterWhere(board, fields)],
				},
			});
			rank = ahead + 1;
			rankCache.set(key, rank);
		}
		items.push({
			rank,
			username: row.username,
			name: row.name,
			image: row.image,
			elo: row.elo,
			level: row.level,
			xp: row.xp,
			totalWins: row.totalWins,
			totalGamesHosted: row.totalGamesHosted,
			totalGamesPlayed: row.totalGamesPlayed,
			totalPointsEarned: row.totalPointsEarned,
		});
	}

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
						totalGamesHosted: last.totalGamesHosted,
						totalGamesPlayed: last.totalGamesPlayed,
						totalPointsEarned: last.totalPointsEarned,
					}),
				)
			: null;

	return { items, nextCursor };
}
