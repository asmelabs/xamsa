import {
	channels,
	INBOX_EVENTS,
	type InboxNewMessage,
} from "@xamsa/ably/channels";
import { ablyRest } from "@xamsa/ably/server";
import prisma from "@xamsa/db";
import type { NotificationType } from "@xamsa/schemas/db/schemas/enums/NotificationType.schema";

export type CreateNotificationInput = {
	type: NotificationType;
	recipientUserId: string;
	actorUserId: string | null;
	groupKey: string;

	postId?: string | null;
	commentId?: string | null;
	packId?: string | null;
	topicId?: string | null;
	gameId?: string | null;

	/**
	 * When set, suppress create if a row with the same
	 * (recipientUserId, groupKey) was created within this many ms.
	 * Useful for reaction toggles (heart -> remove -> heart) that would
	 * otherwise stack three rows.
	 */
	skipIfExistsWithinMs?: number;
};

/**
 * Persist a notification row, then push it onto the recipient's Ably
 * inbox channel so any open tab updates the bell instantly. All errors
 * are swallowed and logged — notifications are best-effort and must
 * never block the originating mutation.
 */
export async function createNotification(
	input: CreateNotificationInput,
): Promise<{ id: string } | null> {
	if (input.recipientUserId === input.actorUserId) {
		return null;
	}

	if (input.skipIfExistsWithinMs && input.skipIfExistsWithinMs > 0) {
		const since = new Date(Date.now() - input.skipIfExistsWithinMs);
		const recent = await prisma.notification.findFirst({
			where: {
				recipientUserId: input.recipientUserId,
				groupKey: input.groupKey,
				actorUserId: input.actorUserId ?? undefined,
				createdAt: { gte: since },
			},
			select: { id: true },
		});
		if (recent) {
			return null;
		}
	}

	const row = await prisma.notification.create({
		data: {
			type: input.type,
			recipientUserId: input.recipientUserId,
			actorUserId: input.actorUserId,
			groupKey: input.groupKey,
			postId: input.postId ?? null,
			commentId: input.commentId ?? null,
			packId: input.packId ?? null,
			topicId: input.topicId ?? null,
			gameId: input.gameId ?? null,
		},
		select: { id: true, createdAt: true, type: true, groupKey: true },
	});

	const unreadCount = await prisma.notification.count({
		where: {
			recipientUserId: input.recipientUserId,
			seenAt: null,
		},
	});

	const payload: InboxNewMessage = {
		id: row.id,
		groupKey: row.groupKey,
		type: row.type,
		createdAt: row.createdAt.toISOString(),
		unreadCount,
	};

	try {
		await ablyRest.channels
			.get(channels.userInbox(input.recipientUserId))
			.publish(INBOX_EVENTS.NOTIFICATION_NEW, payload);
	} catch (err) {
		console.error("[createNotification] ably publish", err);
	}

	return { id: row.id };
}
