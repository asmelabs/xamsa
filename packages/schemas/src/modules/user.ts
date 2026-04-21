import z from "zod";
import { GameStatusSchema } from "../db/schemas/enums/GameStatus.schema";
import { PackSchema, PlayerSchema, UserSchema } from "../db/schemas/models";

export const FindOneProfileInputSchema = UserSchema.pick({
	username: true,
});

export const FindOneProfileOutputSchema = UserSchema.pick({
	username: true,
	name: true,
	image: true,
	role: true,
});

export type FindOneProfileInputType = z.infer<typeof FindOneProfileInputSchema>;
export type FindOneProfileOutputType = z.infer<
	typeof FindOneProfileOutputSchema
>;

/**
 * UPDATE
 */
export const UpdateProfileInputSchema = UserSchema.pick({
	name: true,
}).partial();

export const UpdateProfileOutputSchema = UserSchema.pick({
	username: true,
});

export type UpdateProfileInputType = z.infer<typeof UpdateProfileInputSchema>;
export type UpdateProfileOutputType = z.infer<typeof UpdateProfileOutputSchema>;

/**
 * GET ACTIVE GAME
 */
export const GetActiveGameOutputSchema = z
	.discriminatedUnion("isHost", [
		z.object({
			isHost: z.literal(true),
			code: z.string(),
			status: GameStatusSchema,
		}),
		z.object({
			isHost: z.literal(false),
			code: z.string(),
			status: GameStatusSchema,
			player: PlayerSchema.pick({
				status: true,
				nickname: true,
				score: true,
				rank: true,
			}),
		}),
	])
	.nullable();

export type GetActiveGameOutputType = z.infer<typeof GetActiveGameOutputSchema>;

/**
 * GET MY STATS
 *
 * Returns user-level aggregates used on the home dashboard stats strip.
 * Only fields actually rendered are exposed to keep the payload small.
 */
export const GetMyStatsOutputSchema = UserSchema.pick({
	level: true,
	xp: true,
	totalGamesPlayed: true,
	totalGamesHosted: true,
	totalWins: true,
	totalPodiums: true,
	totalPointsEarned: true,
	totalCorrectAnswers: true,
});

export type GetMyStatsOutputType = z.infer<typeof GetMyStatsOutputSchema>;

/**
 * GET RECENT GAMES
 *
 * Last N finished games the signed-in user took part in (as host or player),
 * ordered by finishedAt desc. Powers both the home "Recent games" list and
 * the paginated /history page.
 */
export const GetRecentGamesInputSchema = z.object({
	limit: z.number().int().min(1).max(50).default(5),
	cursor: z.string().optional(),
});

const RecentGameRowSchema = z.object({
	code: z.string(),
	finishedAt: z.coerce.date(),
	durationSeconds: z.number().int().nullable(),
	pack: PackSchema.pick({ slug: true, name: true }),
	totalPlayers: z.number().int(),
	role: z.enum(["host", "player"]),
	// Populated when role === "player"; mine rank + score when the game
	// was ranked by the finalizer.
	myRank: z.number().int().nullable().optional(),
	myScore: z.number().int().optional(),
	// Populated when role === "host" and the game recorded a winner.
	winnerName: z.string().nullable().optional(),
});

export const GetRecentGamesOutputSchema = z.object({
	items: z.array(RecentGameRowSchema),
	nextCursor: z.string().nullable(),
});

export type GetRecentGamesInputType = z.infer<typeof GetRecentGamesInputSchema>;
export type GetRecentGamesOutputType = z.infer<
	typeof GetRecentGamesOutputSchema
>;
export type RecentGameRow = z.infer<typeof RecentGameRowSchema>;
