import * as z from 'zod';

export const PlayerBadgeAwardScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'earnedAt', 'playerId', 'badgeId', 'gameTopicId', 'gameQuestionId'])

export type PlayerBadgeAwardScalarFieldEnum = z.infer<typeof PlayerBadgeAwardScalarFieldEnumSchema>;