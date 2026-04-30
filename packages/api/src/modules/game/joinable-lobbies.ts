import prisma from "@xamsa/db";
import type {
	ListJoinableWaitingLobbiesInputType,
	ListJoinableWaitingLobbiesOutputType,
} from "@xamsa/schemas/modules/game";
import { MAX_PLAYERS_PER_GAME } from "@xamsa/utils/constants";

/**
 * Recent waiting games with a published public pack that the viewer may join.
 * Excludes games the user hosts, games they're already in (non-left), and full lobbies.
 */
export async function listJoinableWaitingLobbies(
	input: ListJoinableWaitingLobbiesInputType,
	viewerUserId: string,
): Promise<ListJoinableWaitingLobbiesOutputType> {
	const take = Math.min(input.limit * 3, 45);

	const rows = await prisma.game.findMany({
		where: {
			status: "waiting",
			hostId: { not: viewerUserId },
			pack: {
				status: "published",
				visibility: "public",
			},
			NOT: {
				players: {
					some: {
						userId: viewerUserId,
						status: { not: "left" },
					},
				},
			},
		},
		orderBy: { createdAt: "desc" },
		take,
		select: {
			code: true,
			pack: { select: { name: true } },
			host: { select: { username: true, name: true } },
			players: {
				where: { status: "playing" },
				select: { id: true },
			},
		},
	});

	const items: ListJoinableWaitingLobbiesOutputType["items"] = [];
	for (const row of rows) {
		if (row.players.length >= MAX_PLAYERS_PER_GAME) continue;
		items.push({
			code: row.code,
			packName: row.pack.name,
			hostUsername: row.host.username,
			hostName: row.host.name,
			playerCount: row.players.length,
		});
		if (items.length >= input.limit) break;
	}

	return { items };
}
