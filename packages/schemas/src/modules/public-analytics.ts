import z from "zod";

/** Aggregate buzz outcomes for charts (correct / wrong / expired). */
export const PublicAnalyticsClickMixSchema = z.object({
	correct: z.number().int(),
	wrong: z.number().int(),
	expired: z.number().int(),
	pending: z.number().int(),
	resolvedTotal: z.number().int(),
	pctCorrectOfResolved: z.number(),
	pctWrongOfResolved: z.number(),
	pctExpiredOfResolved: z.number(),
});

export const PublicAnalyticsRankedUserSchema = z.object({
	username: z.string(),
	name: z.string(),
	count: z.number().int(),
});

const playerLeaderboardsSchema = z.object({
	topBuzzers: z.array(PublicAnalyticsRankedUserSchema).max(10),
	topCorrectAnswers: z.array(PublicAnalyticsRankedUserSchema).max(10),
	topIncorrectAnswers: z.array(PublicAnalyticsRankedUserSchema).max(10),
	topPlayed: z.array(PublicAnalyticsRankedUserSchema).max(10),
});

export const PackAnalyticsOutputSchema = z.object({
	completedGamesCount: z.number().int(),
	totalPlays: z.number().int(),
	clicks: PublicAnalyticsClickMixSchema,
	hostsDistinct: z.number().int(),
	...playerLeaderboardsSchema.shape,
	topHostsByGames: z.array(PublicAnalyticsRankedUserSchema).max(10),
	firstPlayedAt: z.coerce.date().nullable(),
	lastPlayedAt: z.coerce.date().nullable(),
});

export type PackAnalyticsOutputType = z.infer<typeof PackAnalyticsOutputSchema>;

export const TopicAnalyticsOutputSchema = PackAnalyticsOutputSchema.omit({
	totalPlays: true,
}).extend({
	topicOrder: z.number().int(),
});

export type TopicAnalyticsOutputType = z.infer<
	typeof TopicAnalyticsOutputSchema
>;

export const QuestionAnalyticsOutputSchema = PackAnalyticsOutputSchema.omit({
	totalPlays: true,
}).extend({
	questionOrder: z.number().int(),
});

export type QuestionAnalyticsOutputType = z.infer<
	typeof QuestionAnalyticsOutputSchema
>;
