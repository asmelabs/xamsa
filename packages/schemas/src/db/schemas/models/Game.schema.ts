import * as z from 'zod';
import { GameStatusSchema } from '../enums/GameStatus.schema';

export const GameSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  startedAt: z.coerce.date().nullish(),
  finishedAt: z.coerce.date().nullish(),
  pausedAt: z.coerce.date().nullish(),
  code: z.string(),
  status: GameStatusSchema.default("waiting"),
  hostId: z.string(),
  packId: z.string(),
  currentRoundOrder: z.number().int().nullish(),
  currentTopicOrder: z.number().int().nullish(),
  currentQuestionOrder: z.number().int().nullish(),
  isQuestionRevealed: z.boolean(),
  totalActivePlayers: z.number().int(),
  totalTopics: z.number().int(),
  totalQuestions: z.number().int(),
  totalSkippedQuestions: z.number().int(),
  totalAnswers: z.number().int(),
  totalCorrectAnswers: z.number().int(),
  totalIncorrectAnswers: z.number().int(),
  totalExpiredAnswers: z.number().int(),
  totalPointsAwarded: z.number().int(),
  totalPointsDeducted: z.number().int(),
  durationSeconds: z.number().int().nullish(),
  winnerId: z.string().nullish(),
  completionDeltas: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
  includedTopicPackOrders: z.unknown().refine((val) => { const getDepth = (obj: unknown, depth: number = 0): number => { if (depth > 10) return depth; if (obj === null || typeof obj !== 'object') return depth; const values = Object.values(obj as Record<string, unknown>); if (values.length === 0) return depth; return Math.max(...values.map(v => getDepth(v, depth + 1))); }; return getDepth(val) <= 10; }, "JSON nesting depth exceeds maximum of 10").nullish(),
});

export type GameType = z.infer<typeof GameSchema>;
