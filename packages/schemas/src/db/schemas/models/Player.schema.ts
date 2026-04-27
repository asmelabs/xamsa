import * as z from 'zod';
import { LeaveReasonSchema } from '../enums/LeaveReason.schema';
import { PlayerStatusSchema } from '../enums/PlayerStatus.schema';

export const PlayerSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  joinedAt: z.coerce.date(),
  startedAt: z.coerce.date().nullish(),
  leftAt: z.coerce.date().nullish(),
  leaveReason: LeaveReasonSchema.nullish(),
  status: PlayerStatusSchema.default("playing"),
  nickname: z.string().nullish(),
  gameId: z.string(),
  userId: z.string(),
  score: z.number().int(),
  rank: z.number().int().nullish(),
  peakScore: z.number().int(),
  lowestScore: z.number().int(),
  totalClicks: z.number().int(),
  correctAnswers: z.number().int(),
  incorrectAnswers: z.number().int(),
  expiredClicks: z.number().int(),
  firstClicks: z.number().int(),
  lastClicks: z.number().int(),
  fastestClickMs: z.number().int().nullish(),
  averageClickMs: z.number().nullish(),
  currentCorrectStreak: z.number().int(),
  longestCorrectStreak: z.number().int(),
  currentWrongStreak: z.number().int(),
  longestWrongStreak: z.number().int(),
  topicsPlayed: z.number().int(),
});

export type PlayerType = z.infer<typeof PlayerSchema>;
