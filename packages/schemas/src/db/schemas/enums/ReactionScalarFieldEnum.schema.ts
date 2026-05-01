import * as z from 'zod';

export const ReactionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'type', 'userId', 'postId', 'commentId'])

export type ReactionScalarFieldEnum = z.infer<typeof ReactionScalarFieldEnumSchema>;