import * as z from 'zod';

export const CommentSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  body: z.string().min(1, 'Comment is required').max(5000, 'Comment must be 5000 characters or less'),
  depth: z.number().int(),
  userId: z.string(),
  parentId: z.string().nullish(),
  rootId: z.string(),
  packId: z.string().nullish(),
  topicId: z.string().nullish(),
  questionId: z.string().nullish(),
  postId: z.string().nullish(),
  totalReactions: z.number().int(),
});

export type CommentType = z.infer<typeof CommentSchema>;
