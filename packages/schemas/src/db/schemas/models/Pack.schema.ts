import * as z from 'zod';
import { PackLanguageSchema } from '../enums/PackLanguage.schema';
import { PackStatusSchema } from '../enums/PackStatus.schema';
import { PackVisibilitySchema } from '../enums/PackVisibility.schema';

export const PackSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
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
  allowOthersHost: z.boolean(),
  showTopicsInfo: z.boolean().default(true),
  authorId: z.string(),
});

export type PackType = z.infer<typeof PackSchema>;
