import * as z from 'zod';

export const FollowStatusSchema = z.enum(['accepted'])

export type FollowStatus = z.infer<typeof FollowStatusSchema>;