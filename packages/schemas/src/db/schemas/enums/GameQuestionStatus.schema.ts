import * as z from 'zod';

export const GameQuestionStatusSchema = z.enum(['pending', 'active', 'answered', 'revealed', 'skipped'])

export type GameQuestionStatus = z.infer<typeof GameQuestionStatusSchema>;