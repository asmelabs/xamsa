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
	"abomination",
	"genius",
	"dunce",
	"dominator",
	"survivor",
]);

export type BadgeId = z.infer<typeof BadgeIdSchema>;

// --- listEarners ---

export const ListBadgeEarnersInputSchema = CursorPaginationInputSchema.extend({
	badgeId: BadgeIdSchema,
	/** Optional case-insensitive substring match on earner username. */
	username: z.string().min(1).max(64).optional(),
	/** Optional exact match on the game's join code. */
	gameCode: z.string().min(1).max(32).optional(),
	/** Inclusive lower bound on `earnedAt`. */
	from: z.coerce.date().optional(),
	/** Inclusive upper bound on `earnedAt`. */
	to: z.coerce.date().optional(),
});

export const BadgeEarnerRowSchema = z.object({
	id: z.string(),
	badgeId: BadgeIdSchema,
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

// --- getCatalogStats ---

/**
 * Total earns + unique earners per badge id, for the badges directory's
 * "Total earns" / "Unique earners" sort columns. Cached briefly on the client
 * since the catalog rarely changes faster than minute-to-minute.
 */
export const BadgeCatalogStatsRowSchema = z.object({
	badgeId: BadgeIdSchema,
	totalEarns: z.number().int().min(0),
	uniqueEarners: z.number().int().min(0),
});

export const GetBadgeCatalogStatsOutputSchema = z.object({
	rows: z.array(BadgeCatalogStatsRowSchema),
	/**
	 * Players who could have earned at least one badge — currently anyone with
	 * `User.totalGamesPlayed > 0`. Used by the directory to compute rarity from
	 * `uniqueEarners / totalEligibleUsers`.
	 */
	totalEligibleUsers: z.number().int().min(0),
});

export type GetBadgeCatalogStatsOutputType = z.infer<
	typeof GetBadgeCatalogStatsOutputSchema
>;
export type BadgeCatalogStatsRow = z.infer<typeof BadgeCatalogStatsRowSchema>;

// --- findAward ---

/**
 * Single award by id. Used by the per-award share page and OG.
 * Returns 404 if the award is private (game not visible) or missing.
 */
export const FindBadgeAwardInputSchema = z.object({
	awardId: z.string().uuid(),
});

export const FindBadgeAwardOutputSchema = z.object({
	id: z.string(),
	badgeId: BadgeIdSchema,
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

export type FindBadgeAwardInputType = z.infer<typeof FindBadgeAwardInputSchema>;
export type FindBadgeAwardOutputType = z.infer<
	typeof FindBadgeAwardOutputSchema
>;
