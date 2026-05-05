import * as z from 'zod';

export const ReactionEmailNotificationScalarFieldEnumSchema = z.enum(['id', 'sentAt', 'recipientUserId', 'postId'])

export type ReactionEmailNotificationScalarFieldEnum = z.infer<typeof ReactionEmailNotificationScalarFieldEnumSchema>;