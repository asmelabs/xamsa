import * as z from 'zod';

export const MentionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'mentionedUserId', 'createdByUserId', 'postId', 'commentId'])

export type MentionScalarFieldEnum = z.infer<typeof MentionScalarFieldEnumSchema>;