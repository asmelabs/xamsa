import * as z from 'zod';

export const ClickScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'clickedAt', 'answeredAt', 'status', 'playerId', 'gameId', 'topicId', 'questionId', 'position', 'reactionMs', 'pointsAwarded'])

export type ClickScalarFieldEnum = z.infer<typeof ClickScalarFieldEnumSchema>;