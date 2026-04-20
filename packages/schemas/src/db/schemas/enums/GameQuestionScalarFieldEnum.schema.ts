import * as z from 'zod';

export const GameQuestionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'startedAt', 'finishedAt', 'gameTopicId', 'questionId', 'order', 'points', 'status', 'wasRevealed', 'wasSkipped', 'winnerId', 'totalClicks', 'totalCorrectAnswers', 'totalIncorrectAnswers', 'totalExpiredClicks', 'firstBuzzMs', 'durationSeconds'])

export type GameQuestionScalarFieldEnum = z.infer<typeof GameQuestionScalarFieldEnumSchema>;