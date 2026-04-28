import type prisma from "@xamsa/db";
import type { Prisma } from "@xamsa/db";
import type { DuplicateQuestionPolicy } from "@xamsa/schemas/db/schemas/enums/DuplicateQuestionPolicy.schema";

type Db = typeof prisma | Prisma.TransactionClient;

/**
 * Returns the subset of `candidateUserIds` who have at least one Click on this
 * `questionId` in a completed game for the same pack (excluding `excludeGameId`).
 */
export async function userIdsWhoSawQuestionInPriorCompletedGames(
	db: Db,
	params: {
		packId: string;
		questionId: string;
		excludeGameId: string;
		candidateUserIds: string[];
	},
): Promise<Set<string>> {
	const { packId, questionId, excludeGameId, candidateUserIds } = params;
	if (candidateUserIds.length === 0) {
		return new Set();
	}

	const rows = await db.click.findMany({
		where: {
			questionId,
			game: {
				packId,
				status: "completed",
				id: { not: excludeGameId },
			},
			player: {
				userId: { in: candidateUserIds },
			},
		},
		select: {
			player: { select: { userId: true } },
		},
	});

	return new Set(rows.map((r) => r.player.userId));
}

export function duplicateBuzzBlockedForUser(params: {
	policy: DuplicateQuestionPolicy;
	currentUserId: string;
	/** Users among candidates who have prior exposure. */
	sawBefore: Set<string>;
}): { blocked: boolean; because: "individual" | "room" | null } {
	const { policy, currentUserId, sawBefore } = params;
	if (policy === "none" || sawBefore.size === 0) {
		return { blocked: false, because: null };
	}

	if (policy === "block_individuals") {
		if (sawBefore.has(currentUserId)) {
			return { blocked: true, because: "individual" };
		}
		return { blocked: false, because: null };
	}

	// block_room — any prior exposure among the candidate set locks the question for everyone
	if (sawBefore.size > 0) {
		return { blocked: true, because: "room" };
	}
	return { blocked: false, because: null };
}
