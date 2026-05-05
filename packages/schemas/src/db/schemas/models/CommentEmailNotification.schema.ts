import * as z from 'zod';

export const CommentEmailNotificationSchema = z.object({
  id: z.string(),
  sentAt: z.coerce.date(),
  recipientUserId: z.string(),
  postId: z.string(),
});

export type CommentEmailNotificationType = z.infer<typeof CommentEmailNotificationSchema>;
