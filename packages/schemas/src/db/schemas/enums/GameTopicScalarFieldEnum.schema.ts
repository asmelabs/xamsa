import * as z from 'zod';

export const GameTopicScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'startedAt', 'finishedAt', 'gameId', 'topicId', 'order', 'totalQuestionsAnswered', 'totalQuestionsSkipped', 'totalClicks', 'totalCorrectAnswers', 'totalIncorrectAnswers', 'totalExpiredClicks', 'totalPointsAwarded', 'totalPointsDeducted', 'topScorerId', 'topScorerPoints', 'durationSeconds'])

export type GameTopicScalarFieldEnum = z.infer<typeof GameTopicScalarFieldEnumSchema>;