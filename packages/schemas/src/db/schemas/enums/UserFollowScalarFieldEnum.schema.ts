import * as z from 'zod';

export const UserFollowScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'status', 'followerId', 'followingId'])

export type UserFollowScalarFieldEnum = z.infer<typeof UserFollowScalarFieldEnumSchema>;