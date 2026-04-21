import * as z from 'zod';

export const PlayerStatusSchema = z.enum(['playing', 'left'])

export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;