import * as z from 'zod';

export const MentionEmailNotificationScalarFieldEnumSchema = z.enum(['id', 'sentAt', 'recipientUserId', 'postId'])

export type MentionEmailNotificationScalarFieldEnum = z.infer<typeof MentionEmailNotificationScalarFieldEnumSchema>;