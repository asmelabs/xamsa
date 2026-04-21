import * as z from 'zod';
import { GameQuestionStatusSchema } from '../enums/GameQuestionStatus.schema';

export const GameQuestionSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  startedAt: z.coerce.date().nullish(),
  finishedAt: z.coerce.date().nullish(),
  gameTopicId: z.string(),
  questionId: z.string(),
  order: z.number().int(),
  points: z.number().int(),
  status: GameQuestionStatusSchema.default("pending"),
  wasRevealed: z.boolean(),
  wasSkipped: z.boolean(),
  winnerId: z.string().nullish(),
  totalClicks: z.number().int(),
  totalCorrectAnswers: z.number().int(),
  totalIncorrectAnswers: z.number().int(),
  totalExpiredClicks: z.number().int(),
  firstBuzzMs: z.number().int().nullish(),
  durationSeconds: z.number().int().nullish(),
});

export type GameQuestionType = z.infer<typeof GameQuestionSchema>;
