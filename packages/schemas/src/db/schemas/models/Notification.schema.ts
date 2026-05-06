import * as z from 'zod';
import { NotificationTypeSchema } from '../enums/NotificationType.schema';

export const NotificationSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  type: NotificationTypeSchema,
  recipientUserId: z.string(),
  actorUserId: z.string().nullish(),
  groupKey: z.string(),
  postId: z.string().nullish(),
  commentId: z.string().nullish(),
  packId: z.string().nullish(),
  topicId: z.string().nullish(),
  gameId: z.string().nullish(),
  seenAt: z.coerce.date().nullish(),
  readAt: z.coerce.date().nullish(),
});

export type NotificationType = z.infer<typeof NotificationSchema>;
