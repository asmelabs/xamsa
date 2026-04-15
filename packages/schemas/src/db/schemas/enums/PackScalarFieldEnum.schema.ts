import * as z from 'zod';

export const PackScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'visibility', 'status', 'slug', 'name', 'description', 'image', 'language', 'averageRating', 'totalRatings', 'totalPlays', 'authorId'])

export type PackScalarFieldEnum = z.infer<typeof PackScalarFieldEnumSchema>;