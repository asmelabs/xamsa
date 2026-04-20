import * as z from 'zod';

export const PlayerStatusSchema = z.enum(['spectating', 'playing', 'kicked', 'left'])

export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;