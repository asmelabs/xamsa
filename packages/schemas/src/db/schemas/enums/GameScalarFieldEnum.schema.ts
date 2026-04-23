import * as z from 'zod';

export const GameScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'startedAt', 'finishedAt', 'pausedAt', 'code', 'status', 'hostId', 'packId', 'currentRoundOrder', 'currentTopicOrder', 'currentQuestionOrder', 'isQuestionRevealed', 'totalActivePlayers', 'totalTopics', 'totalQuestions', 'totalSkippedQuestions', 'totalAnswers', 'totalCorrectAnswers', 'totalIncorrectAnswers', 'totalExpiredAnswers', 'totalPointsAwarded', 'totalPointsDeducted', 'durationSeconds', 'winnerId', 'completionDeltas'])

export type GameScalarFieldEnum = z.infer<typeof GameScalarFieldEnumSchema>;