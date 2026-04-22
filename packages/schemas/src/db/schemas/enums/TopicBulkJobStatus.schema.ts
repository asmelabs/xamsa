import * as z from 'zod';

export const TopicBulkJobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed'])

export type TopicBulkJobStatus = z.infer<typeof TopicBulkJobStatusSchema>;