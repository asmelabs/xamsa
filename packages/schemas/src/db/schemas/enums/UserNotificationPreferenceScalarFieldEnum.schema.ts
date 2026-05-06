import * as z from 'zod';

export const UserNotificationPreferenceScalarFieldEnumSchema = z.enum(['userId', 'createdAt', 'updatedAt', 'mentionInApp', 'mentionEmail', 'reactionOnPostInApp', 'reactionOnPostEmail', 'reactionOnCommentInApp', 'reactionOnCommentEmail', 'commentOnPostInApp', 'commentOnPostEmail', 'replyToCommentInApp', 'replyToCommentEmail', 'followInApp', 'followEmail', 'packPublishedInApp', 'packPublishedEmail', 'gameStartedInApp', 'gameStartedEmail', 'gameFinishedInApp', 'gameFinishedEmail', 'muteAllExceptSecurity', 'emailQuietHoursEnabled', 'emailQuietHoursStartMin', 'emailQuietHoursEndMin', 'emailQuietHoursTimezone'])

export type UserNotificationPreferenceScalarFieldEnum = z.infer<typeof UserNotificationPreferenceScalarFieldEnumSchema>;