import * as z from 'zod';

export const TopicScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'slug', 'order', 'name', 'description', 'packId', 'tdr', 'tdrUpdatedAt'])

export type TopicScalarFieldEnum = z.infer<typeof TopicScalarFieldEnumSchema>;