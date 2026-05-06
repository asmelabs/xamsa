import prisma from "@xamsa/db";
import type { NotificationPreferenceOutputType } from "@xamsa/schemas/modules/notification";

/**
 * Read or lazily create the per-user preference row. Defaults are
 * defined on the Prisma model itself; the upsert here just ensures we
 * always have a row to read from later (Prisma's `findUnique` returns
 * null otherwise).
 */
export async function getOrCreatePreferences(
	userId: string,
): Promise<NotificationPreferenceOutputType> {
	const row = await prisma.userNotificationPreference.upsert({
		where: { userId },
		create: { userId },
		update: {},
	});
	return toPreferenceOutput(row);
}

export function toPreferenceOutput(row: {
	mentionInApp: NotificationPreferenceOutputType["mentionInApp"];
	mentionEmail: NotificationPreferenceOutputType["mentionEmail"];
	reactionOnPostInApp: NotificationPreferenceOutputType["reactionOnPostInApp"];
	reactionOnPostEmail: NotificationPreferenceOutputType["reactionOnPostEmail"];
	reactionOnCommentInApp: NotificationPreferenceOutputType["reactionOnCommentInApp"];
	reactionOnCommentEmail: NotificationPreferenceOutputType["reactionOnCommentEmail"];
	commentOnPostInApp: NotificationPreferenceOutputType["commentOnPostInApp"];
	commentOnPostEmail: NotificationPreferenceOutputType["commentOnPostEmail"];
	replyToCommentInApp: NotificationPreferenceOutputType["replyToCommentInApp"];
	replyToCommentEmail: NotificationPreferenceOutputType["replyToCommentEmail"];
	followInApp: boolean;
	followEmail: boolean;
	packPublishedInApp: boolean;
	packPublishedEmail: boolean;
	gameStartedInApp: boolean;
	gameStartedEmail: boolean;
	gameFinishedInApp: boolean;
	gameFinishedEmail: boolean;
	muteAllExceptSecurity: boolean;
	emailQuietHoursEnabled: boolean;
	emailQuietHoursStartMin: number;
	emailQuietHoursEndMin: number;
	emailQuietHoursTimezone: string;
}): NotificationPreferenceOutputType {
	return {
		mentionInApp: row.mentionInApp,
		mentionEmail: row.mentionEmail,
		reactionOnPostInApp: row.reactionOnPostInApp,
		reactionOnPostEmail: row.reactionOnPostEmail,
		reactionOnCommentInApp: row.reactionOnCommentInApp,
		reactionOnCommentEmail: row.reactionOnCommentEmail,
		commentOnPostInApp: row.commentOnPostInApp,
		commentOnPostEmail: row.commentOnPostEmail,
		replyToCommentInApp: row.replyToCommentInApp,
		replyToCommentEmail: row.replyToCommentEmail,
		followInApp: row.followInApp,
		followEmail: row.followEmail,
		packPublishedInApp: row.packPublishedInApp,
		packPublishedEmail: row.packPublishedEmail,
		gameStartedInApp: row.gameStartedInApp,
		gameStartedEmail: row.gameStartedEmail,
		gameFinishedInApp: row.gameFinishedInApp,
		gameFinishedEmail: row.gameFinishedEmail,
		muteAllExceptSecurity: row.muteAllExceptSecurity,
		emailQuietHoursEnabled: row.emailQuietHoursEnabled,
		emailQuietHoursStartMin: row.emailQuietHoursStartMin,
		emailQuietHoursEndMin: row.emailQuietHoursEndMin,
		emailQuietHoursTimezone: row.emailQuietHoursTimezone,
	};
}
