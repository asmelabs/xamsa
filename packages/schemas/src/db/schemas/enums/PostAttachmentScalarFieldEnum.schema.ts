import * as z from 'zod';

export const PostAttachmentScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'resource', 'postId', 'gameId', 'packId', 'topicId'])

export type PostAttachmentScalarFieldEnum = z.infer<typeof PostAttachmentScalarFieldEnumSchema>;