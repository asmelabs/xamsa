import z from "zod";
import {
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
} from "../common/pagination";
import { UserSchema } from "../db/schemas/models";

/**
 * Keep in sync with `badges` keys in `@xamsa/utils/badges`.
 */
export const BadgeIdSchema = z.enum([
	"ace",
	"scavenger",
	"ghost",
	"jackpot",
	"magnificent",
	"bankrupt",
]);

export type BadgeId = z.infer<typeof BadgeIdSchema>;

// --- listEarners ---

export const ListBadgeEarnersInputSchema = CursorPaginationInputSchema.extend({
	badgeId: BadgeIdSchema,
});

export const BadgeEarnerRowSchema = z.object({
	id: z.string(),
	earnedAt: z.coerce.date(),
	user: UserSchema.pick({
		username: true,
		name: true,
		image: true,
	}),
	game: z.object({
		code: z.string(),
		pack: z.object({ slug: z.string(), name: z.string() }),
	}),
	topic: z
		.object({
			order: z.number().int(),
			slug: z.string(),
			name: z.string(),
		})
		.nullable(),
	questionOrder: z.number().int().nullable(),
});

export const ListBadgeEarnersOutputSchema =
	CursorPaginationOutputSchema(BadgeEarnerRowSchema);

export type ListBadgeEarnersInputType = z.infer<
	typeof ListBadgeEarnersInputSchema
>;
export type ListBadgeEarnersOutputType = z.infer<
	typeof ListBadgeEarnersOutputSchema
>;

// --- getPublicSummaryByUsername ---

export const GetPublicBadgeSummaryByUsernameInputSchema = UserSchema.pick({
	username: true,
});

export const BadgeCountRowSchema = z.object({
	badgeId: BadgeIdSchema,
	count: z.number().int().min(0),
	lastEarnedAt: z.coerce.date().nullable(),
});

export const GetPublicBadgeSummaryByUsernameOutputSchema = z.object({
	rows: z.array(BadgeCountRowSchema),
});

export type GetPublicBadgeSummaryByUsernameInputType = z.infer<
	typeof GetPublicBadgeSummaryByUsernameInputSchema
>;
export type GetPublicBadgeSummaryByUsernameOutputType = z.infer<
	typeof GetPublicBadgeSummaryByUsernameOutputSchema
>;

// --- listPublicAwardsByUsername ---

export const ListPublicAwardsByUsernameInputSchema =
	CursorPaginationInputSchema.extend({
		username: UserSchema.shape.username,
		badgeId: BadgeIdSchema.optional(),
	});

export const ListPublicAwardsByUsernameOutputSchema =
	CursorPaginationOutputSchema(BadgeEarnerRowSchema);

export type ListPublicAwardsByUsernameInputType = z.infer<
	typeof ListPublicAwardsByUsernameInputSchema
>;
export type ListPublicAwardsByUsernameOutputType = z.infer<
	typeof ListPublicAwardsByUsernameOutputSchema
>;
