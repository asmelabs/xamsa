import * as z from 'zod';

export const PackVisibilitySchema = z.enum(['public', 'private'])

export type PackVisibility = z.infer<typeof PackVisibilitySchema>;