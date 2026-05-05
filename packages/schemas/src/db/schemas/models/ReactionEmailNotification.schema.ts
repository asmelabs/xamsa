import * as z from 'zod';

export const ReactionEmailNotificationSchema = z.object({
  id: z.string(),
  sentAt: z.coerce.date(),
  recipientUserId: z.string(),
  postId: z.string(),
});

export type ReactionEmailNotificationType = z.infer<typeof ReactionEmailNotificationSchema>;
