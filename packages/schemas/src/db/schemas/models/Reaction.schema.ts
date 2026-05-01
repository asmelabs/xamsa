import * as z from 'zod';
import { ReactionTypeSchema } from '../enums/ReactionType.schema';

export const ReactionSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  type: ReactionTypeSchema,
  userId: z.string(),
  postId: z.string().nullish(),
  commentId: z.string().nullish(),
});

export type ReactionType = z.infer<typeof ReactionSchema>;
