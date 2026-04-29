import z from "zod";
import { ClickStatusSchema } from "../db/schemas/enums/ClickStatus.schema";
import { DuplicateQuestionPolicySchema } from "../db/schemas/enums/DuplicateQuestionPolicy.schema";
import { GameQuestionStatusSchema } from "../db/schemas/enums/GameQuestionStatus.schema";
import { GameStatusSchema } from "../db/schemas/enums/GameStatus.schema";
import {
	ClickSchema,
	GameSchema,
	PackSchema,
	PlayerSchema,
	QuestionSchema,
	TopicSchema,
	UserSchema,
} from "../db/schemas/models";
import { BadgeIdSchema } from "./badge";

export const CreateGameInputSchema = z.object({
	pack: PackSchema.shape.slug,
});

export const CreateGameOutputSchema = GameSchema.pick({
	code: true,
});

export type CreateGameInputType = z.infer<typeof CreateGameInputSchema>;
export type CreateGameOutputType = z.infer<typeof CreateGameOutputSchema>;

/**
 * DELETE
 */
export const DeleteGameInputSchema = GameSchema.pick({
	code: true,
});

export const DeleteGameOutputSchema = GameSchema.pick({
	code: true,
});

export type DeleteGameInputType = z.infer<typeof DeleteGameInputSchema>;
export type DeleteGameOutputType = z.infer<typeof DeleteGameOutputSchema>;

/**
 * UPDATE STATUS
 */
export const UpdateGameStatusInputSchema = GameSchema.pick({
	code: true,
}).extend({
	status: GameStatusSchema.exclude(["waiting"]),
});

export const UpdateGameStatusOutputSchema = GameSchema.pick({
	code: true,
});

export type UpdateGameStatusInputType = z.infer<
	typeof UpdateGameStatusInputSchema
>;
export type UpdateGameStatusOutputType = z.infer<
	typeof UpdateGameStatusOutputSchema
>;

/**
 * FIND ONE
 */
export const FindOneGameInputSchema = GameSchema.pick({
	code: true,
});

const GameClickSchema = ClickSchema.pick({
	id: true,
	position: true,
	status: true,
	clickedAt: true,
	playerId: true,
}).extend({
	_intentId: z.string().nullish(),
	_isTentative: z.boolean().nullish(),
});

const GameHostClickSchema = ClickSchema.pick({
	id: true,
	position: true,
	status: true,
	clickedAt: true,
	answeredAt: true,
	reactionMs: true,
	pointsAwarded: true,
	playerId: true,
}).extend({
	_intentId: z.string().nullish(),
	_isTentative: z.boolean().nullish(),
});

const GamePlayerSchema = PlayerSchema.pick({
	id: true,
	score: true,
	rank: true,
	status: true,
	joinedAt: true,
	leftAt: true,
	peakScore: true,
	lowestScore: true,
	totalClicks: true,
	correctAnswers: true,
	incorrectAnswers: true,
	expiredClicks: true,
	firstClicks: true,
	lastClicks: true,
	fastestClickMs: true,
	averageClickMs: true,
	longestCorrectStreak: true,
	longestWrongStreak: true,
	topicsPlayed: true,
}).extend({
	user: UserSchema.pick({
		username: true,
		name: true,
		image: true,
	}),
});

export const FindOneGameOutputSchema = GameSchema.pick({
	code: true,
	status: true,
	startedAt: true,
	finishedAt: true,
	pausedAt: true,
	currentTopicOrder: true,
	currentQuestionOrder: true,
	isQuestionRevealed: true,
	hostId: true,
}).extend({
	currentTopic: TopicSchema.pick({
		slug: true,
		name: true,
		order: true,
		description: true,
	})
		.extend({
			/** Host-only: omitted for players during live play. */
			tdr: z.number().optional(),
			hasRatedDifficulty: z.boolean().optional(),
		})
		.nullable(),

	currentQuestion: z
		.object({
			order: z.number().int(),
			points: z.number().int(),
			text: z.string().nullable(),
			answer: z.string().nullable(),
			explanation: z.string().nullable(),
			acceptableAnswers: z.array(z.string()),
		})
		.nullable(),

	isHost: z.boolean(),

	players: z.array(GamePlayerSchema),
	clicks: z.array(GameClickSchema),
	myPlayer: GamePlayerSchema.nullable(),

	hostData: z
		.object({
			currentQuestion: QuestionSchema.pick({
				order: true,
				text: true,
				answer: true,
				acceptableAnswers: true,
				explanation: true,
				qdr: true,
				qdrScoredAttempts: true,
			}).nullable(),

			clickDetails: z.array(GameHostClickSchema),
		})
		.nullable(),

	pack: PackSchema.pick({
		slug: true,
		name: true,
		description: true,
		language: true,
	}).extend({
		author: UserSchema.pick({
			username: true,
			name: true,
		}),
		/** Host-only: omitted for players during live play. */
		pdr: z.number().optional(),
		hasRatedDifficulty: z.boolean().optional(),
	}),

	packTotalTopics: z.number().int(),

	/** Sorted pack topic orders included in this session (same length as `packTotalTopics`). */
	sessionTopicPackOrders: z.array(z.number().int()),

	winnerId: z.string().nullable(),

	/** True when completion rewards were persisted (games finalized after this shipped). */
	rewardsRecorded: z.boolean(),

	/** Set when a full play session is finalized; used on end-game and stats. */
	hostXpGained: z.number().int().nullable(),
	eloDeltaByUserId: z.record(z.string(), z.number().int()).default({}),
	myEloDelta: z.number().int().nullable(),

	/** When duplicate-question policy applies, buzz is disabled for this user on the current question. */
	myDuplicateBuzzBlocked: z.boolean(),
	myDuplicateBuzzBlockedReason: z.enum(["individual", "room"]).nullable(),

	/**
	 * Host-only: explains who is affected by replay-style duplicate blocking on the
	 * current unrevealed question. Null when not applicable or for non-hosts.
	 */
	hostDuplicateBuzzNotice: z
		.object({
			mode: z.enum(["room", "individuals"]),
			affectedPlayers: z.array(
				z.object({
					playerId: z.string(),
					displayName: z.string(),
				}),
			),
		})
		.nullable(),
});

export type FindOneGameInputType = z.infer<typeof FindOneGameInputSchema>;
export type FindOneGameOutputType = z.infer<typeof FindOneGameOutputSchema>;

/**
 * START
 */
export const GameStartInputSchema = z.object({
	code: GameSchema.shape.code,
	duplicateQuestionPolicy: DuplicateQuestionPolicySchema.default("none"),
	/** Explicit subset of pack topic `order` values; omit for all topics (legacy). */
	topicPackOrders: z.array(z.number().int()).optional(),
});

export const GameStartOutputSchema = GameSchema.pick({
	code: true,
	status: true,
	startedAt: true,
	currentTopicOrder: true,
	currentQuestionOrder: true,
});

export type GameStartInputType = z.infer<typeof GameStartInputSchema>;
export type GameStartOutputType = z.infer<typeof GameStartOutputSchema>;

/**
 * REVEAL QUESTION
 */
export const RevealQuestionInputSchema = z.object({
	code: GameSchema.shape.code,
});

export const RevealQuestionOutputSchema = z.object({
	order: z.number().int(),
	text: z.string(),
	answer: z.string(),
	explanation: z.string().nullable(),
	acceptableAnswers: z.array(z.string()),
});

export type RevealQuestionInputType = z.infer<typeof RevealQuestionInputSchema>;
export type RevealQuestionOutputType = z.infer<
	typeof RevealQuestionOutputSchema
>;

/**
 * ADVANCE QUESTION
 */
export const AdvanceQuestionInputSchema = z.object({
	code: GameSchema.shape.code,
});

const HostCurrentQuestionSchema = QuestionSchema.pick({
	order: true,
	text: true,
	answer: true,
	acceptableAnswers: true,
	explanation: true,
});

const AdvanceCurrentTopicSchema = TopicSchema.pick({
	slug: true,
	name: true,
	order: true,
	description: true,
});

export const AdvanceQuestionOutputSchema = z.object({
	currentTopicOrder: z.number().int(),
	currentQuestionOrder: z.number().int(),
	isQuestionRevealed: z.boolean(),
	currentTopic: AdvanceCurrentTopicSchema.nullable(),
	currentQuestionPublic: z.object({
		order: z.number().int(),
		points: z.number().int(),
	}),
	hostCurrentQuestion: HostCurrentQuestionSchema.nullable(),
});

export type AdvanceQuestionInputType = z.infer<
	typeof AdvanceQuestionInputSchema
>;
export type AdvanceQuestionOutputType = z.infer<
	typeof AdvanceQuestionOutputSchema
>;

export const SkipQuestionInputSchema = z.object({
	code: GameSchema.shape.code,
});

export const SkipQuestionOutputSchema = AdvanceQuestionOutputSchema;

export type SkipQuestionInputType = z.infer<typeof SkipQuestionInputSchema>;
export type SkipQuestionOutputType = z.infer<typeof SkipQuestionOutputSchema>;

/**
 * COMPLETE GAME
 */
export const CompleteGameInputSchema = z.object({
	code: GameSchema.shape.code,
});

export const CompleteGameOutputSchema = z.object({
	status: z.literal("completed"),
	finishedAt: z.date(),
	winnerId: z.string().nullable(),
	playerRanks: z.array(
		z.object({
			id: z.string(),
			rank: z.number().int(),
			score: z.number().int(),
		}),
	),
});

export type CompleteGameInputType = z.infer<typeof CompleteGameInputSchema>;
export type CompleteGameOutputType = z.infer<typeof CompleteGameOutputSchema>;

/**
 * LEAVE AS HOST
 *
 * Host-initiated abandonment. Finalizes the game with whatever stats are in
 * flight. Mirrors CompleteGame's shape so clients can reuse the same reducer.
 */
export const LeaveAsHostInputSchema = z.object({
	code: GameSchema.shape.code,
});

export const LeaveAsHostOutputSchema = CompleteGameOutputSchema;

export type LeaveAsHostInputType = z.infer<typeof LeaveAsHostInputSchema>;
export type LeaveAsHostOutputType = z.infer<typeof LeaveAsHostOutputSchema>;

/**
 * HANDLE HOST DISCONNECT
 *
 * Called by players when they observe the host drop out of the Ably
 * presence set. Server enforces a short grace period and re-checks presence
 * before finalizing so briefly disconnected hosts (refresh / network blip)
 * aren't treated as abandonment.
 */
export const HandleHostDisconnectInputSchema = z.object({
	code: GameSchema.shape.code,
});

export const HandleHostDisconnectOutputSchema = z.object({
	status: z.enum(["active", "paused", "waiting", "completed", "aborted"]),
	finalized: z.boolean(),
	winnerId: z.string().nullable().optional(),
	finishedAt: z.date().nullable().optional(),
});

export type HandleHostDisconnectInputType = z.infer<
	typeof HandleHostDisconnectInputSchema
>;
export type HandleHostDisconnectOutputType = z.infer<
	typeof HandleHostDisconnectOutputSchema
>;

/**
 * COMPLETED GAME RECAP — full stats for the stats page (topics, questions, clicks).
 */
export const GetCompletedGameRecapInputSchema = FindOneGameInputSchema;

const RecapClickSchema = z.object({
	id: z.string(),
	position: z.number().int(),
	status: ClickStatusSchema,
	clickedAt: z.coerce.date(),
	answeredAt: z.coerce.date().nullable(),
	reactionMs: z.number().int().nullable(),
	pointsAwarded: z.number().int(),
	playerId: z.string(),
	playerName: z.string(),
});

const RecapQuestionSchema = z.object({
	order: z.number().int(),
	points: z.number().int(),
	status: GameQuestionStatusSchema,
	wasSkipped: z.boolean(),
	wasRevealed: z.boolean(),
	text: z.string(),
	answer: z.string(),
	winnerPlayerId: z.string().nullable(),
	winnerName: z.string().nullable(),
	firstBuzzMs: z.number().int().nullable(),
	durationSeconds: z.number().int().nullable(),
	totalClicks: z.number().int(),
	totalCorrectAnswers: z.number().int(),
	totalIncorrectAnswers: z.number().int(),
	totalExpiredClicks: z.number().int(),
	qdr: z.number(),
	qdrScoredAttempts: z.number().int(),
	clicks: z.array(RecapClickSchema),
});

const RecapTopicSchema = z.object({
	order: z.number().int(),
	topicName: z.string(),
	topicSlug: z.string(),
	tdr: z.number(),
	hasRatedDifficulty: z.boolean(),
	durationSeconds: z.number().int().nullable(),
	totalClicks: z.number().int(),
	totalCorrectAnswers: z.number().int(),
	totalIncorrectAnswers: z.number().int(),
	totalExpiredClicks: z.number().int(),
	totalQuestionsAnswered: z.number().int(),
	totalQuestionsSkipped: z.number().int(),
	questions: z.array(RecapQuestionSchema),
});

const RecapScoreTimelineStepSchema = z.object({
	stepIndex: z.number().int(),
	label: z.string(),
	scoresByPlayerId: z.record(z.string(), z.number()),
});

const RecapRoundPerformanceRowSchema = z.object({
	playerId: z.string(),
	playerName: z.string(),
	topicOrder: z.number().int(),
	topicName: z.string(),
	totalQuestions: z.number().int(),
	questionsCorrect: z.number().int(),
});

const RecapBadgeAwardSchema = z.object({
	id: z.string(),
	badgeId: BadgeIdSchema,
	playerId: z.string(),
	earnedAt: z.coerce.date(),
	topicOrder: z.number().int().nullable(),
	topicSlug: z.string().nullable(),
	topicName: z.string().nullable(),
	questionOrder: z.number().int().nullable(),
});

export const GetCompletedGameRecapOutputSchema = z.object({
	code: z.string(),
	startedAt: z.coerce.date().nullable(),
	finishedAt: z.coerce.date().nullable(),
	durationSeconds: z.number().int().nullable(),
	pack: PackSchema.pick({ slug: true, name: true, pdr: true }).extend({
		hasRatedDifficulty: z.boolean(),
	}),
	winnerId: z.string().nullable(),
	totals: z.object({
		totalTopics: z.number().int(),
		totalQuestions: z.number().int(),
		totalUnresolvedQuestions: z.number().int(),
		totalHostSkippedQuestions: z.number().int(),
		totalAnswers: z.number().int(),
		totalCorrectAnswers: z.number().int(),
		totalIncorrectAnswers: z.number().int(),
		totalExpiredAnswers: z.number().int(),
		totalPointsAwarded: z.number().int(),
		totalPointsDeducted: z.number().int(),
	}),
	players: z.array(GamePlayerSchema),
	topics: z.array(RecapTopicSchema),
	scoreTimeline: z.array(RecapScoreTimelineStepSchema),
	roundPerformance: z.array(RecapRoundPerformanceRowSchema),
	badgeAwards: z.array(RecapBadgeAwardSchema),
});

export type GetCompletedGameRecapInputType = z.infer<
	typeof GetCompletedGameRecapInputSchema
>;
export type GetCompletedGameRecapOutputType = z.infer<
	typeof GetCompletedGameRecapOutputSchema
>;

/** Public feed of completed games (no auth). */
export const ListPublicGameHistoryInputSchema = z.object({
	limit: z.number().int().min(1).max(100).default(30),
	cursor: z.string().optional(),
});

export const PublicGameHistoryItemSchema = z.object({
	code: z.string(),
	finishedAt: z.coerce.date(),
	durationSeconds: z.number().int().nullable(),
	totalActivePlayers: z.number().int(),
	pack: z.object({
		slug: z.string(),
		name: z.string(),
	}),
});

export const ListPublicGameHistoryOutputSchema = z.object({
	items: z.array(PublicGameHistoryItemSchema),
	nextCursor: z.string().nullable(),
});

export type ListPublicGameHistoryInputType = z.infer<
	typeof ListPublicGameHistoryInputSchema
>;
export type ListPublicGameHistoryOutputType = z.infer<
	typeof ListPublicGameHistoryOutputSchema
>;
