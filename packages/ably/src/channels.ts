import { z } from "zod";

export const channels = {
	game: (code: string) => `game:${code}`,
	gameClick: (code: string) => `game:${code}:click`,
	gameHost: (code: string) => `game:${code}:host`,
} as const;

export const GAME_EVENTS = {
	CLICK: "click",
	CLICK_RESET: "click:reset",

	GAME_START: "game:start",
	GAME_END: "game:end",
	GAME_PAUSE: "game:pause",
	GAME_RESUME: "game:resume",

	TOPIC_START: "topic:start",
	TOPIC_END: "topic:end",

	QUESTION_START: "question:start",
	QUESTION_END: "question:end",

	ANSWER_CORRECT: "answer:correct",
	ANSWER_INCORRECT: "answer:incorrect",

	SCORE_UPDATE: "score:update",

	PLAYER_JOIN: "player:join",
	PLAYER_LEAVE: "player:leave",
	PLAYER_KICK: "player:kick",
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
