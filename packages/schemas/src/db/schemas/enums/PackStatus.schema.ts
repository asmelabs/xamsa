import * as z from 'zod';

export const PackStatusSchema = z.enum(['draft', 'published', 'disabled', 'archived', 'deleted'])

export type PackStatus = z.infer<typeof PackStatusSchema>;