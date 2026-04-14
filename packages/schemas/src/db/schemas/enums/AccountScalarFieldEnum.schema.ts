import * as z from 'zod';

export const AccountScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'accessTokenExpiresAt', 'refreshTokenExpiresAt', 'accountId', 'providerId', 'accessToken', 'refreshToken', 'idToken', 'scope', 'password', 'userId'])

export type AccountScalarFieldEnum = z.infer<typeof AccountScalarFieldEnumSchema>;