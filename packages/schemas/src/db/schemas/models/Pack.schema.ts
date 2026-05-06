import * as z from 'zod';
import { PackLanguageSchema } from '../enums/PackLanguage.schema';
import { PackStatusSchema } from '../enums/PackStatus.schema';
import { PackVisibilitySchema } from '../enums/PackVisibility.schema';

export const PackSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  publishedAt: z.coerce.date().nullish(),
  visibility: PackVisibilitySchema.default("public"),
  status: PackStatusSchema.default("draft"),
  slug: z.string(),
  name: z.string().min(3, 'Name must be at least 3 characters long').max(100, 'Name must be less than 100 characters long'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').nullish(),
  image: z.url('Invalid image URL').nullish(),
  language: PackLanguageSchema.default("az"),
  averageRating: z.number(),
  totalRatings: z.number().int(),
  totalPlays: z.number().int(),
  totalTopics: z.number().int(),
  allowOthersHost: z.boolean(),
  showTopicsInfo: z.boolean().default(true),
  pdr: z.number().default(4.5),
  pdrUpdatedAt: z.coerce.date().nullish(),
  authorId: z.string(),
});

export type PackType = z.infer<typeof PackSchema>;
