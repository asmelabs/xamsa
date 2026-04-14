import * as z from 'zod';

export const SessionScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'expiresAt', 'token', 'ipAddress', 'userAgent', 'userId'])

export type SessionScalarFieldEnum = z.infer<typeof SessionScalarFieldEnumSchema>;