import * as z from 'zod';

export const MentionEmailNotificationSchema = z.object({
  id: z.string(),
  sentAt: z.coerce.date(),
  recipientUserId: z.string(),
  postId: z.string(),
});

export type MentionEmailNotificationType = z.infer<typeof MentionEmailNotificationSchema>;
