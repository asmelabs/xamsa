import * as z from 'zod';
import { PostAttachmentResourceSchema } from '../enums/PostAttachmentResource.schema';

export const PostAttachmentSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  resource: PostAttachmentResourceSchema,
  postId: z.string(),
  gameId: z.string().nullish(),
  packId: z.string().nullish(),
  topicId: z.string().nullish(),
});

export type PostAttachmentType = z.infer<typeof PostAttachmentSchema>;
