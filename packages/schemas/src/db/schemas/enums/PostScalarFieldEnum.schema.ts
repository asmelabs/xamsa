import * as z from 'zod';

export const PostScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'slug', 'body', 'image', 'imagePublicId', 'userId', 'totalComments', 'totalReactions'])

export type PostScalarFieldEnum = z.infer<typeof PostScalarFieldEnumSchema>;