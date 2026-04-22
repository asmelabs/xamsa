import * as z from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'username', 'email', 'name', 'image', 'role', 'emailVerified', 'twoFactorEnabled', 'xp', 'level', 'elo', 'peakElo', 'lowestElo', 'totalGamesHosted', 'totalGamesPlayed', 'totalPointsEarned', 'totalWins', 'totalPodiums', 'totalLastPlaces', 'totalTopicsPlayed', 'totalQuestionsPlayed', 'totalCorrectAnswers', 'totalIncorrectAnswers', 'totalExpiredAnswers', 'totalFirstClicks', 'totalTimeSpentPlaying', 'totalTimeSpentHosting', 'totalPacksPublished'])

export type UserScalarFieldEnum = z.infer<typeof UserScalarFieldEnumSchema>;