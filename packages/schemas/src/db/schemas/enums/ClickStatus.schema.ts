import * as z from 'zod';

export const ClickStatusSchema = z.enum(['pending', 'correct', 'wrong', 'expired'])

export type ClickStatus = z.infer<typeof ClickStatusSchema>;