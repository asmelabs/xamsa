import * as z from 'zod';

export const NotificationScalarFieldEnumSchema = z.enum(['id', 'createdAt', 'type', 'recipientUserId', 'actorUserId', 'groupKey', 'postId', 'commentId', 'packId', 'topicId', 'gameId', 'seenAt', 'readAt'])

export type NotificationScalarFieldEnum = z.infer<typeof NotificationScalarFieldEnumSchema>;