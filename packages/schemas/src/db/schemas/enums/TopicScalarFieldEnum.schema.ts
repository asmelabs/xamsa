import * as z from 'zod';

export const TopicScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'slug', 'order', 'name', 'description', 'packId'])

export type TopicScalarFieldEnum = z.infer<typeof TopicScalarFieldEnumSchema>;