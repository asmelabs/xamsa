import * as z from 'zod';

export const UserScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'username', 'email', 'name', 'image', 'role', 'emailVerified', 'twoFactorEnabled'])

export type UserScalarFieldEnum = z.infer<typeof UserScalarFieldEnumSchema>;