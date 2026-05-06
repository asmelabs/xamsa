import prisma from "@xamsa/db";
import type { NotificationDeliveryLevel } from "@xamsa/schemas/db/schemas/enums/NotificationDeliveryLevel.schema";
import { isInEmailQuietHours } from "./quiet-hours";

/**
 * Categories the existing email helpers map onto. The notification
 * preferences row carries one column per category for both in-app and
 * email; this helper resolves the email side, including quiet hours
 * and the master "mute all except security" switch.
 */
export type EmailGateLevelCategory =
	| "mention"
	| "reactionOnPost"
	| "reactionOnComment"
	| "commentOnPost"
	| "replyToComment";

export type EmailGateBinaryCategory =
	| "follow"
	| "packPublished"
	| "gameStarted"
	| "gameFinished";

/**
 * Returns true when an email of the given category should be sent to
 * `recipientUserId` right now. Reads the user's preference row (lazily
 * creating defaults), checks `muteAllExceptSecurity`, evaluates the
 * `followers` relationship when the level requires it, and finally
 * defers to email quiet hours.
 *
 * Always-fail-closed on errors: notification side-effects must never
 * surface as user-visible mutation failures.
 */
export async function shouldSendCategoryEmail(args: {
	recipientUserId: string;
	actorUserId?: string | null;
	category: EmailGateLevelCategory | EmailGateBinaryCategory;
}): Promise<boolean> {
	try {
		const prefs = await prisma.userNotificationPreference.upsert({
			where: { userId: args.recipientUserId },
			create: { userId: args.recipientUserId },
			update: {},
		});
		if (prefs.muteAllExceptSecurity) {
			return false;
		}

		switch (args.category) {
			case "mention":
				if (!(await checkLevel(prefs.mentionEmail, args))) return false;
				break;
			case "reactionOnPost":
				if (!(await checkLevel(prefs.reactionOnPostEmail, args))) return false;
				break;
			case "reactionOnComment":
				if (!(await checkLevel(prefs.reactionOnCommentEmail, args)))
					return false;
				break;
			case "commentOnPost":
				if (!(await checkLevel(prefs.commentOnPostEmail, args))) return false;
				break;
			case "replyToComment":
				if (!(await checkLevel(prefs.replyToCommentEmail, args))) return false;
				break;
			case "follow":
				if (!prefs.followEmail) return false;
				break;
			case "packPublished":
				if (!prefs.packPublishedEmail) return false;
				break;
			case "gameStarted":
				if (!prefs.gameStartedEmail) return false;
				break;
			case "gameFinished":
				if (!prefs.gameFinishedEmail) return false;
				break;
		}

		return !(await isInEmailQuietHours(args.recipientUserId));
	} catch (err) {
		console.error("[shouldSendCategoryEmail]", err);
		return false;
	}
}

async function checkLevel(
	level: NotificationDeliveryLevel,
	args: { recipientUserId: string; actorUserId?: string | null },
): Promise<boolean> {
	if (level === "all") return true;
	if (level === "none") return false;
	if (!args.actorUserId) return false;
	const row = await prisma.userFollow.findUnique({
		where: {
			followerId_followingId: {
				followerId: args.recipientUserId,
				followingId: args.actorUserId,
			},
		},
		select: { id: true },
	});
	return row != null;
}
