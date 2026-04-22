import * as z from 'zod';

export const UserTsualPackageImportScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'userId', 'tsualPackageId', 'packId'])

export type UserTsualPackageImportScalarFieldEnum = z.infer<typeof UserTsualPackageImportScalarFieldEnumSchema>;