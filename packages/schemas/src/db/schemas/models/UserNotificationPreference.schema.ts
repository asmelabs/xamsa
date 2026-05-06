import * as z from 'zod';
import { NotificationDeliveryLevelSchema } from '../enums/NotificationDeliveryLevel.schema';

export const UserNotificationPreferenceSchema = z.object({
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  mentionInApp: NotificationDeliveryLevelSchema.default("all"),
  mentionEmail: NotificationDeliveryLevelSchema.default("all"),
  reactionOnPostInApp: NotificationDeliveryLevelSchema.default("all"),
  reactionOnPostEmail: NotificationDeliveryLevelSchema.default("all"),
  reactionOnCommentInApp: NotificationDeliveryLevelSchema.default("all"),
  reactionOnCommentEmail: NotificationDeliveryLevelSchema.default("none"),
  commentOnPostInApp: NotificationDeliveryLevelSchema.default("all"),
  commentOnPostEmail: NotificationDeliveryLevelSchema.default("all"),
  replyToCommentInApp: NotificationDeliveryLevelSchema.default("all"),
  replyToCommentEmail: NotificationDeliveryLevelSchema.default("all"),
  followInApp: z.boolean().default(true),
  followEmail: z.boolean().default(true),
  packPublishedInApp: z.boolean().default(true),
  packPublishedEmail: z.boolean(),
  gameStartedInApp: z.boolean().default(true),
  gameStartedEmail: z.boolean(),
  gameFinishedInApp: z.boolean().default(true),
  gameFinishedEmail: z.boolean(),
  muteAllExceptSecurity: z.boolean(),
  emailQuietHoursEnabled: z.boolean(),
  emailQuietHoursStartMin: z.number().int().default(1320),
  emailQuietHoursEndMin: z.number().int().default(420),
  emailQuietHoursTimezone: z.string().default("UTC"),
});

export type UserNotificationPreferenceType = z.infer<typeof UserNotificationPreferenceSchema>;
