import { ORPCError } from "@orpc/server";
import type { Prisma } from "@xamsa/db";
import prisma from "@xamsa/db";
import type {
	ListPublicGameHistoryInputType,
	ListPublicGameHistoryOutputType,
} from "@xamsa/schemas/modules/game";

const CURSOR_V = 1 as const;

type HistoryCursor = {
	v: typeof CURSOR_V;
	f: string; // ISO
	id: string;
};

function encodeCursor(c: HistoryCursor): string {
	return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

function decodeCursor(raw: string): HistoryCursor {
	let parsed: unknown;
	try {
		parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
	} catch {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor" });
	}
	if (!parsed || typeof parsed !== "object") {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor" });
	}
	const p = parsed as Record<string, unknown>;
	if (p.v !== CURSOR_V || typeof p.f !== "string" || typeof p.id !== "string") {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor" });
	}
	return { v: CURSOR_V, f: p.f, id: p.id };
}

/**
 * Public list of recently completed games (no auth). Cursor pages by
 * `finishedAt` desc, `id` desc.
 */
export async function listPublicGameHistory(
	input: ListPublicGameHistoryInputType,
): Promise<ListPublicGameHistoryOutputType> {
	const limit = input.limit;
	let cursor: HistoryCursor | null = null;
	if (input.cursor) {
		cursor = decodeCursor(input.cursor);
	}

	const baseWhere: Prisma.GameWhereInput = {
		status: "completed",
		finishedAt: { not: null },
	};

	const where: Prisma.GameWhereInput = cursor
		? {
				AND: [
					baseWhere,
					{
						OR: [
							{ finishedAt: { lt: new Date(cursor.f) } },
							{
								AND: [
									{ finishedAt: new Date(cursor.f) },
									{ id: { lt: cursor.id } },
								],
							},
						],
					},
				],
			}
		: baseWhere;

	const rows = await prisma.game.findMany({
		where,
		orderBy: [{ finishedAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		select: {
			id: true,
			code: true,
			finishedAt: true,
			durationSeconds: true,
			totalActivePlayers: true,
			pack: { select: { slug: true, name: true } },
		},
	});

	const hasNext = rows.length > limit;
	const page = hasNext ? rows.slice(0, limit) : rows;
	const last = page[page.length - 1];
	const nextCursor =
		hasNext && last?.finishedAt
			? encodeCursor({
					v: CURSOR_V,
					f: last.finishedAt.toISOString(),
					id: last.id,
				})
			: null;

	return {
		items: page.map((g) => ({
			code: g.code,
			finishedAt: g.finishedAt as Date,
			durationSeconds: g.durationSeconds,
			totalActivePlayers: g.totalActivePlayers,
			pack: { slug: g.pack.slug, name: g.pack.name },
		})),
		nextCursor,
	};
}
