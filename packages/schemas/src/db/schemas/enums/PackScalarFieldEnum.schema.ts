import * as z from 'zod';

export const PackScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'publishedAt', 'visibility', 'status', 'slug', 'name', 'description', 'image', 'language', 'averageRating', 'totalRatings', 'totalPlays', 'allowOthersHost', 'showTopicsInfo', 'authorId'])

export type PackScalarFieldEnum = z.infer<typeof PackScalarFieldEnumSchema>;