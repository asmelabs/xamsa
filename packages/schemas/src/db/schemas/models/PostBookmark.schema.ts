import * as z from 'zod';

export const PostBookmarkSchema = z.object({
  createdAt: z.coerce.date(),
  userId: z.string(),
  postId: z.string(),
});

export type PostBookmarkType = z.infer<typeof PostBookmarkSchema>;
