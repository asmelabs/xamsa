import * as z from 'zod';

export const GameStatusSchema = z.enum(['waiting', 'active', 'paused', 'completed'])

export type GameStatus = z.infer<typeof GameStatusSchema>;