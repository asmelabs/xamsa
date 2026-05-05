import * as z from 'zod';

export const CommentEmailNotificationScalarFieldEnumSchema = z.enum(['id', 'sentAt', 'recipientUserId', 'postId'])

export type CommentEmailNotificationScalarFieldEnum = z.infer<typeof CommentEmailNotificationScalarFieldEnumSchema>;