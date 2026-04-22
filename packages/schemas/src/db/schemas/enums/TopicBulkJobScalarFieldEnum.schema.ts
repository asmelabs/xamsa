import * as z from 'zod';

export const TopicBulkJobScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'updatedAt', 'userId', 'packSlug', 'status', 'payload', 'totalTopics', 'errorMessage', 'result'])

export type TopicBulkJobScalarFieldEnum = z.infer<typeof TopicBulkJobScalarFieldEnumSchema>;