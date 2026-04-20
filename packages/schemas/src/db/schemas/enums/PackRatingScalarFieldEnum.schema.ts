import * as z from 'zod';

export const PackRatingScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'rating', 'feedback', 'userId', 'packId'])

export type PackRatingScalarFieldEnum = z.infer<typeof PackRatingScalarFieldEnumSchema>;