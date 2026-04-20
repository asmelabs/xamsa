import * as z from 'zod';

export const PackLanguageSchema = z.enum(['en', 'az', 'ru', 'tr'])

export type PackLanguage = z.infer<typeof PackLanguageSchema>;