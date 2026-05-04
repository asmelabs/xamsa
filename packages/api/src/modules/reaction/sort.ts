import type { ReactionType as ReactionEmoji } from "@xamsa/schemas/db/schemas/enums/ReactionType.schema";

export type ReactionByType = {
	type: ReactionEmoji;
	count: number;
};

/**
 * Sort a per-type breakdown so the most-used reaction comes first; ties broken
 * alphabetically by type for stability. Drops zero-count entries — they never
 * make it into the row payload.
 */
export function sortedReactionsByTypeFromGrouped(
	items: readonly { type: ReactionEmoji; count: number }[],
): ReactionByType[] {
	return [...items]
		.filter(({ count }) => count > 0)
		.sort((a, b) =>
			b.count !== a.count ? b.count - a.count : a.type.localeCompare(b.type),
		);
}
