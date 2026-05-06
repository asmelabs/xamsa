import * as z from 'zod';

export const NotificationTypeSchema = z.enum(['mention_post', 'mention_comment', 'reaction_post', 'reaction_comment', 'comment_on_post', 'reply_to_comment', 'follow', 'pack_published', 'game_started', 'game_finished', 'system'])

export type NotificationType = z.infer<typeof NotificationTypeSchema>;