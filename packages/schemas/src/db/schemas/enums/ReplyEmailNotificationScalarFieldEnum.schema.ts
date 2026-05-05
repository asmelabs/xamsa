import * as z from 'zod';

export const ReplyEmailNotificationScalarFieldEnumSchema = z.enum(['id', 'sentAt', 'recipientUserId', 'parentCommentId'])

export type ReplyEmailNotificationScalarFieldEnum = z.infer<typeof ReplyEmailNotificationScalarFieldEnumSchema>;