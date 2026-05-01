import * as z from 'zod';

export const PostSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  slug: z.string().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  body: z.string().min(1, 'Body is required when present').max(10000, 'Body must be 10000 characters or less').nullish(),
  image: z.url('Invalid image URL').nullish(),
  imagePublicId: z.string().nullish(),
  userId: z.string(),
  totalComments: z.number().int(),
  totalReactions: z.number().int(),
});

export type PostType = z.infer<typeof PostSchema>;
