import * as z from 'zod';

export const GameTopicSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  startedAt: z.coerce.date().nullish(),
  finishedAt: z.coerce.date().nullish(),
  gameId: z.string(),
  topicId: z.string(),
  order: z.number().int(),
  totalQuestionsAnswered: z.number().int(),
  totalQuestionsSkipped: z.number().int(),
  totalClicks: z.number().int(),
  totalCorrectAnswers: z.number().int(),
  totalIncorrectAnswers: z.number().int(),
  totalExpiredClicks: z.number().int(),
  totalPointsAwarded: z.number().int(),
  totalPointsDeducted: z.number().int(),
  topScorerId: z.string().nullish(),
  topScorerPoints: z.number().int(),
  durationSeconds: z.number().int().nullish(),
});

export type GameTopicType = z.infer<typeof GameTopicSchema>;
