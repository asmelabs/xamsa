import * as z from 'zod';

export const PostBookmarkScalarFieldEnumSchema = z.enum(['createdAt', 'userId', 'postId'])

export type PostBookmarkScalarFieldEnum = z.infer<typeof PostBookmarkScalarFieldEnumSchema>;