import * as z from 'zod';

export const MentionSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  mentionedUserId: z.string(),
  createdByUserId: z.string(),
  postId: z.string().nullish(),
  commentId: z.string().nullish(),
});

export type MentionType = z.infer<typeof MentionSchema>;
