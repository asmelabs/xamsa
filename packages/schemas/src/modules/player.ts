import * as z from "zod";
import { GameSchema, PlayerSchema } from "../db/schemas/models";

/**
 * JOIN
 */
export const PlayerJoinInputSchema = GameSchema.pick({
	code: true,
});

export const PlayerJoinOutputSchema = PlayerSchema.pick({
	id: true,
	status: true,
	joinedAt: true,
});

export type PlayerJoinInputType = z.infer<typeof PlayerJoinInputSchema>;
export type PlayerJoinOutputType = z.infer<typeof PlayerJoinOutputSchema>;

/**
 * LEAVE - player voluntarily left the game
 */
export const PlayerLeaveInputSchema = GameSchema.pick({
	code: true,
});

export const PlayerLeaveOutputSchema = PlayerSchema.pick({
	id: true,
	status: true,
	leftAt: true,
});

export type PlayerLeaveInputType = z.infer<typeof PlayerLeaveInputSchema>;
export type PlayerLeaveOutputType = z.infer<typeof PlayerLeaveOutputSchema>;

/**
 * KICK - player was kicked from the game
 */
export const PlayerKickInputSchema = GameSchema.pick({
	code: true,
}).extend({
	playerId: z.string(),
});

export const PlayerKickOutputSchema = PlayerSchema.pick({
	id: true,
	status: true,
	leftAt: true,
});

export type PlayerKickInputType = z.infer<typeof PlayerKickInputSchema>;
export type PlayerKickOutputType = z.infer<typeof PlayerKickOutputSchema>;
