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
	xp: true,
	level: true,
	elo: true,
	peakElo: true,
	lowestElo: true,
	totalFollowers: true,
	totalFollowing: true,
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

/** ~1.75MB raw → base64; keep headroom for padding / data-URL prefix stripped client-side. */
const AVATAR_IMAGE_BASE64_MAX_CHARS = 2_500_000;

export const AvatarImageMimeTypeSchema = z.enum([
	"image/jpeg",
	"image/png",
	"image/webp",
]);

export const SetUserAvatarInputSchema = z
	.object({
		imageBase64: z.string().min(1).max(AVATAR_IMAGE_BASE64_MAX_CHARS),
		mimeType: AvatarImageMimeTypeSchema,
	})
	.transform(({ imageBase64, mimeType }) => {
		const t = imageBase64.trim();
		const asDataUrl = t.match(
			/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i,
		);
		if (asDataUrl) {
			const mimeFromDataUrl = asDataUrl[1];
			const payload = asDataUrl[2];
			if (!mimeFromDataUrl || payload === undefined) {
				throw new z.ZodError([
					{
						code: "custom",
						path: ["imageBase64"],
						message: "Malformed data URL",
					},
				]);
			}
			const fromUrl = mimeFromDataUrl.toLowerCase() as z.infer<
				typeof AvatarImageMimeTypeSchema
			>;
			if (fromUrl !== mimeType) {
				throw new z.ZodError([
					{
						code: "custom",
						path: ["mimeType"],
						message: "MIME type does not match the data URL image type",
					},
				]);
			}
			return {
				imageBase64: payload.replace(/\s/g, ""),
				mimeType,
			};
		}
		return {
			imageBase64: t.replace(/\s/g, ""),
			mimeType,
		};
	});

export const SetUserAvatarOutputSchema = z.object({
	image: z.url(),
});

export const RemoveUserAvatarOutputSchema = z.object({
	image: z.null(),
});

export const RemoveUserAvatarInputSchema = z.object({});

export type SetUserAvatarInputType = z.infer<typeof SetUserAvatarInputSchema>;
export type SetUserAvatarOutputType = z.infer<typeof SetUserAvatarOutputSchema>;
export type RemoveUserAvatarOutputType = z.infer<
	typeof RemoveUserAvatarOutputSchema
>;
export type RemoveUserAvatarInputType = z.infer<
	typeof RemoveUserAvatarInputSchema
>;

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
	totalIncorrectAnswers: true,
	totalExpiredAnswers: true,
	totalFirstClicks: true,
	totalLastPlaces: true,
	totalTopicsPlayed: true,
	totalQuestionsPlayed: true,
	totalTimeSpentPlaying: true,
	totalTimeSpentHosting: true,
	totalPacksPublished: true,
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

/**
 * PUBLIC PROFILE — STATS
 *
 * Same aggregates as `getMyStats`, keyed by public username.
 */
export const GetPublicStatsInputSchema = UserSchema.pick({
	username: true,
});

export const GetPublicStatsOutputSchema = GetMyStatsOutputSchema;

export type GetPublicStatsInputType = z.infer<typeof GetPublicStatsInputSchema>;
export type GetPublicStatsOutputType = z.infer<
	typeof GetPublicStatsOutputSchema
>;

/**
 * PUBLIC PROFILE — RECENT GAMES
 *
 * Same rows as `getRecentGames`, for the user matching `username`.
 */
export const GetPublicRecentGamesInputSchema = GetRecentGamesInputSchema.extend(
	{
		username: UserSchema.shape.username,
	},
);

export type GetPublicRecentGamesInputType = z.infer<
	typeof GetPublicRecentGamesInputSchema
>;

export const GetPublicRecentGamesOutputSchema = GetRecentGamesOutputSchema;

export type GetPublicRecentGamesOutputType = z.infer<
	typeof GetPublicRecentGamesOutputSchema
>;

/**
 * PUBLIC PROFILE — GAME ACTIVITY BY MONTH
 *
 * Completed games the user hosted or played in, bucketed as YYYY-MM (last 12 months).
 * Capped server-side for query cost.
 */
export const GetPublicGameActivityInputSchema = UserSchema.pick({
	username: true,
});

export const GameActivityMonthSchema = z.object({
	month: z.string(),
	games: z.number().int(),
});

export const GetPublicGameActivityOutputSchema = z.object({
	months: z.array(GameActivityMonthSchema),
});

export type GetPublicGameActivityInputType = z.infer<
	typeof GetPublicGameActivityInputSchema
>;
export type GetPublicGameActivityOutputType = z.infer<
	typeof GetPublicGameActivityOutputSchema
>;

/**
 * FOLLOW — state for the signed-in user viewing a profile
 */
export const GetFollowStateInputSchema = UserSchema.pick({
	username: true,
});

export const GetFollowStateOutputSchema = z.object({
	isFollowing: z.boolean(),
});

export type GetFollowStateInputType = z.infer<typeof GetFollowStateInputSchema>;
export type GetFollowStateOutputType = z.infer<
	typeof GetFollowStateOutputSchema
>;

export const FollowUserInputSchema = UserSchema.pick({
	username: true,
});

export const FollowUserOutputSchema = z.object({
	ok: z.literal(true),
});

export type FollowUserInputType = z.infer<typeof FollowUserInputSchema>;
export type FollowUserOutputType = z.infer<typeof FollowUserOutputSchema>;

export const UnfollowUserInputSchema = UserSchema.pick({
	username: true,
});

export const UnfollowUserOutputSchema = z.object({
	ok: z.literal(true),
});

export type UnfollowUserInputType = z.infer<typeof UnfollowUserInputSchema>;
export type UnfollowUserOutputType = z.infer<typeof UnfollowUserOutputSchema>;

/** Display-only: tolerate empty / invalid avatar strings stored in DB. */
const FollowListAvatarImageSchema = z
	.union([z.string(), z.null(), z.undefined()])
	.transform((v) => {
		if (v == null || v === "") return null;
		const t = typeof v === "string" ? v.trim() : "";
		if (!t) return null;
		return z.string().url().safeParse(t).success ? t : null;
	});

const FollowListUserRowSchema = z.object({
	username: UserSchema.shape.username,
	name: z.string().min(1).max(100),
	image: FollowListAvatarImageSchema,
	viewerFollows: z.boolean(),
});

export const ListFollowersInputSchema = z.object({
	username: UserSchema.shape.username,
	limit: z.number().int().min(1).max(50).default(20),
	cursor: z.string().optional(),
});

export const ListFollowersOutputSchema = z.object({
	items: z.array(FollowListUserRowSchema),
	nextCursor: z.string().nullable(),
});

export type ListFollowersInputType = z.infer<typeof ListFollowersInputSchema>;
export type ListFollowersOutputType = z.infer<typeof ListFollowersOutputSchema>;

export const ListFollowingInputSchema = ListFollowersInputSchema;
export const ListFollowingOutputSchema = ListFollowersOutputSchema;

export type ListFollowingInputType = z.infer<typeof ListFollowingInputSchema>;
export type ListFollowingOutputType = z.infer<typeof ListFollowingOutputSchema>;

/**
 * GLOBAL LEADERBOARD
 *
 * Public ranking over `User` aggregates (updated on game finalization).
 * Elo board requires at least one finished game as a player; XP includes hosts.
 */
export const GlobalLeaderboardBoardSchema = z.enum([
	"elo",
	"xp",
	"wins",
	"hosts",
	"plays",
]);

export const GetGlobalLeaderboardInputSchema = z.object({
	board: GlobalLeaderboardBoardSchema.default("elo"),
	limit: z.number().int().min(1).max(100).default(50),
	cursor: z.string().optional(),
	/** When true, only users the signed-in viewer follows. Requires auth (API returns UNAUTHORIZED if absent). */
	onlyFollowing: z.boolean().optional().default(false),
});

export const GlobalLeaderboardRowSchema = z.object({
	rank: z.number().int(),
	username: z.string(),
	name: z.string(),
	image: z.string().nullable(),
	elo: z.number().int(),
	level: z.number().int(),
	xp: z.number().int(),
	totalWins: z.number().int(),
	totalGamesHosted: z.number().int(),
	totalGamesPlayed: z.number().int(),
	totalPointsEarned: z.number().int(),
});

export const GetGlobalLeaderboardOutputSchema = z.object({
	items: z.array(GlobalLeaderboardRowSchema),
	nextCursor: z.string().nullable(),
});

export type GlobalLeaderboardBoardType = z.infer<
	typeof GlobalLeaderboardBoardSchema
>;
export type GetGlobalLeaderboardInputType = z.infer<
	typeof GetGlobalLeaderboardInputSchema
>;
export type GetGlobalLeaderboardOutputType = z.infer<
	typeof GetGlobalLeaderboardOutputSchema
>;
export type GlobalLeaderboardRowType = z.infer<
	typeof GlobalLeaderboardRowSchema
>;
