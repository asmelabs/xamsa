import * as z from 'zod';

export const CommentScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'body', 'depth', 'userId', 'parentId', 'rootId', 'packId', 'topicId', 'questionId', 'postId', 'totalReactions'])

export type CommentScalarFieldEnum = z.infer<typeof CommentScalarFieldEnumSchema>;