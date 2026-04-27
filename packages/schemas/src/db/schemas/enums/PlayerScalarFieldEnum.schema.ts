import * as z from 'zod';

export const PlayerScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'joinedAt', 'startedAt', 'leftAt', 'leaveReason', 'status', 'nickname', 'gameId', 'userId', 'score', 'rank', 'peakScore', 'lowestScore', 'totalClicks', 'correctAnswers', 'incorrectAnswers', 'expiredClicks', 'firstClicks', 'lastClicks', 'fastestClickMs', 'averageClickMs', 'currentCorrectStreak', 'longestCorrectStreak', 'currentWrongStreak', 'longestWrongStreak', 'topicsPlayed'])

export type PlayerScalarFieldEnum = z.infer<typeof PlayerScalarFieldEnumSchema>;