import { z } from "zod";

export const channels = {
	game: (code: string) => `game:${code}`,
	gameClick: (code: string) => `game:${code}:click`,
	gameHost: (code: string) => `game:${code}:host`,
} as const;

export const GAME_EVENTS = {
	BUZZ_INTENT: "buzz:intent",

	CLICK_NEW: "click:new",
	CLICK_RESOLVE_INTENT: "click:resolve:intent",
	CLICK_RESOLVED: "click:resolved",
	CLICK_REMOVED: "click:removed",

	QUESTION_REVEAL_INTENT: "question:reveal:intent",
	QUESTION_REVEALED: "question:revealed",
	QUESTION_ADVANCE_INTENT: "question:advance:intent",
	QUESTION_ADVANCED: "question:advanced",
	QUESTION_SKIPPED: "question:skipped",

	GAME_STARTED: "game:start",
	GAME_COMPLETE_INTENT: "game:complete:intent",
	GAME_ENDED: "game:end",
	GAME_PAUSED: "game:pause",
	GAME_RESUMED: "game:resume",

	TOPIC_START: "topic:start",
	TOPIC_END: "topic:end",

	QUESTION_START: "question:start",
	QUESTION_END: "question:end",

	ANSWER_CORRECT: "answer:correct",
	ANSWER_INCORRECT: "answer:incorrect",

	SCORE_UPDATE: "score:update",

	PLAYER_JOINED: "player:joined",
	PLAYER_LEFT: "player:left",

	/** Server-only: a player earned a catalog badge (topic / question / game). */
	BADGE_EARNED: "badge:earned",
	/**
	 * Server-only: one or more badges earned in the same action (e.g. Ace + Jackpot).
	 * Clients should enqueue all `events` for the celebration overlay.
	 */
	BADGE_EARNED_BATCH: "badges:earned",
};

export const ClickMessageSchema = z.object({
	playerId: z.string(),
	username: z.string(),
	timestamp: z.number(),
});

export const QuestionStartMessageSchema = z.object({
	topicOrder: z.number(),
	questionOrder: z.number(),
	text: z.string(),
	points: z.number(),
});

export const TopicStartMessageSchema = z.object({
	topicOrder: z.number(),
	name: z.string(),
});

export const AnswerResultMessageSchema = z.object({
	playerId: z.string(),
	username: z.string(),
	correct: z.boolean(),
	points: z.number(),
});

export const ScoreUpdateMessageSchema = z.object({
	scores: z.array(
		z.object({
			playerId: z.string(),
			username: z.string(),
			score: z.number(),
		}),
	),
});

export const PlayerKickedMessageSchema = z.object({
	playerId: z.string(),
	reason: z.string().optional(),
});

export type ClickMessage = z.infer<typeof ClickMessageSchema>;
export type QuestionStartMessage = z.infer<typeof QuestionStartMessageSchema>;
export type TopicStartMessage = z.infer<typeof TopicStartMessageSchema>;
export type AnswerResultMessage = z.infer<typeof AnswerResultMessageSchema>;
export type ScoreUpdateMessage = z.infer<typeof ScoreUpdateMessageSchema>;
export type PlayerKickedMessage = z.infer<typeof PlayerKickedMessageSchema>;

/** Emitted after `PlayerBadgeAward` is persisted; drives client celebration overlay. */
export const BadgeEarnedMessageSchema = z.object({
	badgeId: z.string(),
	playerId: z.string(),
	playerName: z.string().nullable(),
	username: z.string(),
	gameTopicId: z.string().nullable(),
	gameQuestionId: z.string().nullable(),
});

export const BadgeEarnedBatchMessageSchema = z.object({
	events: z.array(BadgeEarnedMessageSchema),
});

export type BadgeEarnedMessage = z.infer<typeof BadgeEarnedMessageSchema>;
export type BadgeEarnedBatchMessage = z.infer<
	typeof BadgeEarnedBatchMessageSchema
>;
