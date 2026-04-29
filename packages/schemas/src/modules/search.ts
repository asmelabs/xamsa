import { z } from "zod";

const HOME_SEARCH_MAX = 8 as const;

/**
 * Unified home search across users, packs, topics, and games.
 * `onlyFollowing` on leaderboard is separate; this is public with optional viewer for visibility.
 */
export const HomeSearchInputSchema = z.object({
	query: z.string().min(1).max(200),
	limit: z.number().int().min(1).max(HOME_SEARCH_MAX).default(HOME_SEARCH_MAX),
});

export const HomeSearchUserItemSchema = z.object({
	kind: z.literal("user"),
	username: z.string(),
	title: z.string(),
	description: z.string().nullable(),
});

export const HomeSearchPackItemSchema = z.object({
	kind: z.literal("pack"),
	slug: z.string(),
	title: z.string(),
	description: z.string().nullable(),
});

export const HomeSearchTopicItemSchema = z.object({
	kind: z.literal("topic"),
	packSlug: z.string(),
	topicSlug: z.string(),
	title: z.string(),
	description: z.string().nullable(),
});

export const HomeSearchGameItemSchema = z.object({
	kind: z.literal("game"),
	code: z.string(),
	title: z.string(),
	description: z.string().nullable(),
});

export const HomeSearchItemSchema = z.discriminatedUnion("kind", [
	HomeSearchUserItemSchema,
	HomeSearchPackItemSchema,
	HomeSearchTopicItemSchema,
	HomeSearchGameItemSchema,
]);

export const HomeSearchOutputSchema = z.object({
	items: z.array(HomeSearchItemSchema),
});

export type HomeSearchInputType = z.infer<typeof HomeSearchInputSchema>;
export type HomeSearchOutputType = z.infer<typeof HomeSearchOutputSchema>;
export type HomeSearchItemType = z.infer<typeof HomeSearchItemSchema>;

export { HOME_SEARCH_MAX };
