// packages/schemas/modules/click.ts
import { z } from "zod";
import { ClickSchema, GameSchema } from "../db/schemas/models";

/**
 * BUZZ — player clicks the buzzer
 */
export const ClickBuzzInputSchema = z.object({
	code: GameSchema.shape.code,
	clickedAt: z.number().int().positive(), // millisecond timestamp from client
	intentId: z.uuid(),
});

export const ClickBuzzOutputSchema = ClickSchema.pick({
	id: true,
	position: true,
	clickedAt: true,
	status: true,
});

export type ClickBuzzInputType = z.infer<typeof ClickBuzzInputSchema>;
export type ClickBuzzOutputType = z.infer<typeof ClickBuzzOutputSchema>;

/**
 * RESOLVE — host marks a pending click as correct or wrong
 */
export const ClickResolveInputSchema = z.object({
	code: GameSchema.shape.code,
	clickId: ClickSchema.shape.id,
	resolution: z.enum(["correct", "wrong"]),
});

export const ClickResolveOutputSchema = ClickSchema.pick({
	id: true,
	status: true,
	pointsAwarded: true,
	answeredAt: true,
});

export type ClickResolveInputType = z.infer<typeof ClickResolveInputSchema>;
export type ClickResolveOutputType = z.infer<typeof ClickResolveOutputSchema>;

const ClickRemovePlayerScoreSchema = z.object({
	playerId: z.string(),
	score: z.number().int(),
	correctAnswers: z.number().int(),
	incorrectAnswers: z.number().int(),
	expiredClicks: z.number().int(),
	currentCorrectStreak: z.number().int(),
	currentWrongStreak: z.number().int(),
	longestCorrectStreak: z.number().int(),
	longestWrongStreak: z.number().int(),
	peakScore: z.number().int(),
	lowestScore: z.number().int(),
});

/**
 * REMOVE — host fully erases a click
 */
export const ClickRemoveInputSchema = z.object({
	code: GameSchema.shape.code,
	clickId: ClickSchema.shape.id,
});

export const ClickRemoveOutputSchema = z.object({
	playerScores: z.array(ClickRemovePlayerScoreSchema),
});

export type ClickRemoveInputType = z.infer<typeof ClickRemoveInputSchema>;
export type ClickRemoveOutputType = z.infer<typeof ClickRemoveOutputSchema>;
