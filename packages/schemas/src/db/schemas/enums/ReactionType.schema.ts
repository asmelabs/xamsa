import * as z from 'zod';

export const ReactionTypeSchema = z.enum(['heart', 'dislike', 'laugh', 'sad', 'angry', 'wow'])

export type ReactionType = z.infer<typeof ReactionTypeSchema>;