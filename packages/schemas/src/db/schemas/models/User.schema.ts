import * as z from 'zod';
import { RoleSchema } from '../enums/Role.schema';

export const UserSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  username: z.string().min(3, 'Username must be at least 3 characters long').max(30, 'Username must be less than 30 characters long').regex(/^[a-z][a-z0-9]+$/, 'Username must contain only lowercase letters and numbers and cannot start with a number'),
  email: z.email('Invalid email address'),
  name: z.string().min(3, 'Name must be at least 3 characters long').max(100, 'Name must be less than 100 characters long'),
  image: z.url('Invalid image URL').nullish(),
  role: RoleSchema.default("user"),
  emailVerified: z.boolean(),
  twoFactorEnabled: z.boolean().nullish(),
  xp: z.number().int(),
  level: z.number().int().default(1),
  elo: z.number().int().default(1000),
  peakElo: z.number().int().default(1000),
  lowestElo: z.number().int().default(1000),
  totalGamesHosted: z.number().int(),
  totalGamesPlayed: z.number().int(),
  totalPointsEarned: z.number().int(),
  totalWins: z.number().int(),
  totalPodiums: z.number().int(),
  totalLastPlaces: z.number().int(),
  totalTopicsPlayed: z.number().int(),
  totalQuestionsPlayed: z.number().int(),
  totalCorrectAnswers: z.number().int(),
  totalIncorrectAnswers: z.number().int(),
  totalExpiredAnswers: z.number().int(),
  totalFirstClicks: z.number().int(),
  totalTimeSpentPlaying: z.number().int(),
  totalTimeSpentHosting: z.number().int(),
  totalPacksPublished: z.number().int(),
});

export type UserType = z.infer<typeof UserSchema>;
