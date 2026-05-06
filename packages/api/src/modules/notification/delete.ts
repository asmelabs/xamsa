import {
	channels,
	INBOX_EVENTS,
	type InboxRemovedMessage,
} from "@xamsa/ably/channels";
import { ablyRest } from "@xamsa/ably/server";
import prisma from "@xamsa/db";

/**
 * Remove unseen notifications matching `(recipient, groupKey, actor?)`
 * because the triggering action was undone (reaction toggled off,
 * comment deleted before being read, unfollow, etc).
 *
 * Rules:
 *  - Only deletes rows where `seenAt IS NULL` so we don't quietly erase
 *    history the recipient has already glanced at.
 *  - When `actorUserId` is provided, only that actor's contribution is
 *    pulled from the group — other actors keep their notification row.
 *  - Recomputes the recipient's unread count and broadcasts a
 *    `notification:removed` event so any open tab updates the bell and
 *    drops orphaned rows from cached lists.
 *
 * Best-effort by design: failures are logged but never thrown — they
 * must not block the originating mutation.
 */
export async function deleteUnseenNotifications(params: {
	recipientUserId: string;
	groupKey: string;
	actorUserId?: string | null;
}): Promise<void> {
	try {
		const result = await prisma.notification.deleteMany({
			where: {
				recipientUserId: params.recipientUserId,
				groupKey: params.groupKey,
				seenAt: null,
				...(params.actorUserId ? { actorUserId: params.actorUserId } : {}),
			},
		});

		if (result.count === 0) return;

		const unreadCount = await prisma.notification.count({
			where: {
				recipientUserId: params.recipientUserId,
				seenAt: null,
			},
		});

		const payload: InboxRemovedMessage = {
			groupKeys: [params.groupKey],
			unreadCount,
		};

		await ablyRest.channels
			.get(channels.userInbox(params.recipientUserId))
			.publish(INBOX_EVENTS.NOTIFICATION_REMOVED, payload);
	} catch (err) {
		console.error("[deleteUnseenNotifications]", err);
	}
}

/**
 * Reaction-specific helper. Resolves the recipient (post / comment
 * author) and the matching group key, then defers to
 * `deleteUnseenNotifications`. Skips when actor === recipient (no
 * row was ever created in that case).
 */
export async function deleteReactionNotification(params: {
	postId?: string | null;
	commentId?: string | null;
	actorUserId: string;
}): Promise<void> {
	if (params.postId) {
		const post = await prisma.post.findUnique({
			where: { id: params.postId },
			select: { userId: true },
		});
		if (!post || post.userId === params.actorUserId) return;
		await deleteUnseenNotifications({
			recipientUserId: post.userId,
			groupKey: `reaction:post:${params.postId}`,
			actorUserId: params.actorUserId,
		});
		return;
	}

	if (params.commentId) {
		const comment = await prisma.comment.findUnique({
			where: { id: params.commentId },
			select: { userId: true },
		});
		if (!comment || comment.userId === params.actorUserId) return;
		await deleteUnseenNotifications({
			recipientUserId: comment.userId,
			groupKey: `reaction:comment:${params.commentId}`,
			actorUserId: params.actorUserId,
		});
	}
}

/**
 * Unfollow helper. Mirrors `notifyFollow` but in reverse: clears any
 * unseen follow notification this actor created for `recipientUserId`.
 * The grouping is per-recipient, so we must scope by `actorUserId` to
 * avoid wiping a row that other followers also contributed to.
 */
export async function deleteFollowNotification(params: {
	recipientUserId: string;
	actorUserId: string;
}): Promise<void> {
	if (params.recipientUserId === params.actorUserId) return;
	await deleteUnseenNotifications({
		recipientUserId: params.recipientUserId,
		groupKey: `follow:${params.recipientUserId}`,
		actorUserId: params.actorUserId,
	});
}

/**
 * Capture the set of unseen `(recipientUserId, groupKey)` rows that
 * reference any of the given subject ids *before* a cascade delete
 * runs, then return a function that publishes a `notification:removed`
 * Ably event per affected recipient with the freshly-recomputed unread
 * count.
 *
 * Usage pattern:
 *
 *   const broadcast = await captureSubjectNotificationsForRemoval({ commentIds });
 *   await prisma.$transaction(async (tx) => { ... cascade-deletes the comments ... });
 *   void broadcast();
 *
 * This is the right pattern for post / comment deletion: Postgres
 * cascades already drop the notification rows (FK `onDelete: Cascade`),
 * so we don't need to delete them ourselves — we just need to refresh
 * the recipient's badge across open tabs.
 */
export async function captureSubjectNotificationsForRemoval(params: {
	postIds?: readonly string[];
	commentIds?: readonly string[];
	packIds?: readonly string[];
	topicIds?: readonly string[];
	gameIds?: readonly string[];
}): Promise<() => Promise<void>> {
	const { postIds, commentIds, packIds, topicIds, gameIds } = params;
	const hasAny =
		(postIds && postIds.length > 0) ||
		(commentIds && commentIds.length > 0) ||
		(packIds && packIds.length > 0) ||
		(topicIds && topicIds.length > 0) ||
		(gameIds && gameIds.length > 0);
	if (!hasAny) {
		return async () => {};
	}

	const rows = await prisma.notification.findMany({
		where: {
			seenAt: null,
			OR: [
				postIds && postIds.length > 0
					? { postId: { in: [...postIds] } }
					: undefined,
				commentIds && commentIds.length > 0
					? { commentId: { in: [...commentIds] } }
					: undefined,
				packIds && packIds.length > 0
					? { packId: { in: [...packIds] } }
					: undefined,
				topicIds && topicIds.length > 0
					? { topicId: { in: [...topicIds] } }
					: undefined,
				gameIds && gameIds.length > 0
					? { gameId: { in: [...gameIds] } }
					: undefined,
			].filter((c): c is NonNullable<typeof c> => c !== undefined),
		},
		select: { recipientUserId: true, groupKey: true },
	});

	if (rows.length === 0) {
		return async () => {};
	}

	const byRecipient = new Map<string, Set<string>>();
	for (const r of rows) {
		const set = byRecipient.get(r.recipientUserId) ?? new Set<string>();
		set.add(r.groupKey);
		byRecipient.set(r.recipientUserId, set);
	}

	return async () => {
		await Promise.all(
			[...byRecipient.entries()].map(async ([recipientUserId, keys]) => {
				try {
					const unreadCount = await prisma.notification.count({
						where: { recipientUserId, seenAt: null },
					});
					const payload: InboxRemovedMessage = {
						groupKeys: [...keys],
						unreadCount,
					};
					await ablyRest.channels
						.get(channels.userInbox(recipientUserId))
						.publish(INBOX_EVENTS.NOTIFICATION_REMOVED, payload);
				} catch (err) {
					console.error("[captureSubjectNotificationsForRemoval] publish", err);
				}
			}),
		);
	};
}
