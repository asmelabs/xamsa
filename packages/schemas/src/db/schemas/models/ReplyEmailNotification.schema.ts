import * as z from 'zod';

export const ReplyEmailNotificationSchema = z.object({
  id: z.string(),
  sentAt: z.coerce.date(),
  recipientUserId: z.string(),
  parentCommentId: z.string(),
});

export type ReplyEmailNotificationType = z.infer<typeof ReplyEmailNotificationSchema>;
