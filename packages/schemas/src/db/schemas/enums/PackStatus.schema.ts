import * as z from 'zod';

export const PackStatusSchema = z.enum(['draft', 'published', 'archived'])

export type PackStatus = z.infer<typeof PackStatusSchema>;