import {
	channels,
	INBOX_EVENTS,
	type InboxReadMessage,
	type InboxSeenMessage,
} from "@xamsa/ably/channels";
import { ablyRest } from "@xamsa/ably/server";
import prisma, { type Prisma } from "@xamsa/db";
import type { NotificationType as NotificationKind } from "@xamsa/schemas/db/schemas/enums/NotificationType.schema";
import type {
	ListNotificationsInputType,
	ListNotificationsOutputType,
	MarkAllReadOutputType,
	MarkAllSeenOutputType,
	MarkReadInputType,
	MarkReadOutputType,
	NotificationActorType,
	NotificationGroupRowType,
	NotificationListFilterType,
	NotificationPreferenceOutputType,
	NotificationSubjectType,
	UnreadCountOutputType,
	UpdateNotificationPreferenceInputType,
} from "@xamsa/schemas/modules/notification";
import { getOrCreatePreferences, toPreferenceOutput } from "./prefs";

const MENTION_TYPES = new Set<NotificationKind>([
	"mention_post",
	"mention_comment",
]);
const SOCIAL_TYPES = new Set<NotificationKind>([
	"reaction_post",
	"reaction_comment",
	"comment_on_post",
	"reply_to_comment",
	"follow",
]);
const GAMEPLAY_TYPES = new Set<NotificationKind>([
	"pack_published",
	"game_started",
	"game_finished",
]);

const NOTIFICATION_INCLUDE = {
	actor: { select: { id: true, username: true, name: true, image: true } },
	post: { select: { id: true, slug: true, body: true } },
	comment: {
		select: {
			id: true,
			body: true,
			post: { select: { id: true, slug: true } },
		},
	},
	pack: { select: { id: true, slug: true, name: true } },
	topic: {
		select: {
			id: true,
			slug: true,
			name: true,
			pack: { select: { slug: true } },
		},
	},
	game: { select: { id: true, code: true } },
} as const;

type NotificationRow = Prisma.NotificationGetPayload<{
	include: typeof NOTIFICATION_INCLUDE;
}>;

/* ------------------------------------------------------------------ */
/* Cursor                                                              */
/* ------------------------------------------------------------------ */

function encodeCursor(row: { createdAt: Date; id: string }): string {
	return Buffer.from(
		JSON.stringify({ c: row.createdAt.toISOString(), id: row.id }),
		"utf8",
	).toString("base64url");
}

function decodeCursor(cursor: string): { c: string; id: string } | null {
	try {
		const raw = Buffer.from(cursor, "base64url").toString("utf8");
		const o = JSON.parse(raw) as { c?: string; id?: string };
		if (
			typeof o.c !== "string" ||
			typeof o.id !== "string" ||
			Number.isNaN(Date.parse(o.c))
		) {
			return null;
		}
		return { c: o.c, id: o.id };
	} catch {
		return null;
	}
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

function whereForFilter(
	userId: string,
	filter: NotificationListFilterType,
	cursor: { c: string; id: string } | null,
): Prisma.NotificationWhereInput {
	const base: Prisma.NotificationWhereInput = { recipientUserId: userId };

	if (cursor != null) {
		base.OR = [
			{ createdAt: { lt: new Date(cursor.c) } },
			{
				AND: [{ createdAt: new Date(cursor.c) }, { id: { lt: cursor.id } }],
			},
		];
	}

	switch (filter) {
		case "all":
			return base;
		case "unread":
			return { ...base, readAt: null };
		case "mention":
			return { ...base, type: { in: [...MENTION_TYPES] } };
		case "social":
			return { ...base, type: { in: [...SOCIAL_TYPES] } };
		case "gameplay":
			return { ...base, type: { in: [...GAMEPLAY_TYPES] } };
	}
}

/* ------------------------------------------------------------------ */
/* Subject + preview                                                   */
/* ------------------------------------------------------------------ */

function excerpt(text: string | null | undefined, max = 120): string | null {
	const t = (text ?? "").replace(/\s+/g, " ").trim();
	if (!t) return null;
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}

function subjectFromRow(row: NotificationRow): NotificationSubjectType {
	const postFromComment = row.comment?.post ?? null;

	const postId = row.post?.id ?? postFromComment?.id ?? null;
	const postSlug = row.post?.slug ?? postFromComment?.slug ?? null;
	const postExcerpt = row.post ? excerpt(row.post.body) : null;
	const commentExcerpt = row.comment ? excerpt(row.comment.body) : null;

	const packSlug = row.pack?.slug ?? row.topic?.pack.slug ?? null;
	const packName = row.pack?.name ?? null;

	const topicSlug = row.topic?.slug ?? null;
	const topicName = row.topic?.name ?? null;

	const gameCode = row.game?.code ?? null;

	let href: string | null = null;
	if (postSlug) {
		const hash = row.commentId ? `#c-${row.commentId}` : "";
		href = `/p/${encodeURIComponent(postSlug)}/${hash}`;
	} else if (packSlug && topicSlug) {
		href = `/packs/${encodeURIComponent(packSlug)}/${encodeURIComponent(topicSlug)}`;
	} else if (packSlug) {
		href = `/packs/${encodeURIComponent(packSlug)}`;
	} else if (gameCode) {
		href = `/g/${encodeURIComponent(gameCode)}`;
	}

	return {
		postId,
		postSlug,
		postBodyExcerpt: postExcerpt,
		commentId: row.commentId,
		commentBodyExcerpt: commentExcerpt,
		packId: row.packId,
		packSlug,
		packName,
		topicId: row.topicId,
		topicSlug,
		topicName,
		gameId: row.gameId,
		gameCode,
		href,
	};
}

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */

type Bucket = {
	head: NotificationRow;
	rest: NotificationRow[];
	groupKey: string;
	type: NotificationKind;
	seen: boolean;
	latestAt: Date;
};

function groupRows(rows: NotificationRow[]): Bucket[] {
	const buckets = new Map<string, Bucket>();
	for (const r of rows) {
		const seen = r.seenAt != null;
		const key = `${r.groupKey}::${seen ? "seen" : "unseen"}`;
		const existing = buckets.get(key);
		if (existing) {
			existing.rest.push(r);
			if (r.createdAt > existing.latestAt) existing.latestAt = r.createdAt;
		} else {
			buckets.set(key, {
				head: r,
				rest: [],
				groupKey: r.groupKey,
				type: r.type,
				seen,
				latestAt: r.createdAt,
			});
		}
	}
	return [...buckets.values()].sort(
		(a, b) => b.latestAt.getTime() - a.latestAt.getTime(),
	);
}

function bucketRows(bucket: Bucket): NotificationRow[] {
	return [bucket.head, ...bucket.rest];
}

function bucketToGroupRow(bucket: Bucket): NotificationGroupRowType {
	const all = bucketRows(bucket);
	const actorsMap = new Map<string, NotificationActorType>();
	for (const r of all) {
		if (r.actor && !actorsMap.has(r.actor.id)) {
			actorsMap.set(r.actor.id, r.actor);
		}
	}
	const actorsAll = [...actorsMap.values()];
	const totalActors = actorsAll.length;
	const actors = actorsAll.slice(0, 3);
	const { head } = bucket;

	return {
		groupKey: bucket.groupKey,
		type: bucket.type,
		latestAt: bucket.latestAt,
		count: all.length,
		actors,
		totalActors,
		subject: subjectFromRow(head),
		seenAt: bucket.seen ? (head.seenAt ?? bucket.latestAt) : null,
		readAt: all.every((r) => r.readAt != null) ? (head.readAt ?? null) : null,
	};
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

export async function listNotifications(
	input: ListNotificationsInputType,
	userId: string,
): Promise<ListNotificationsOutputType> {
	const limit = input.limit ?? 20;
	const cursor = input.cursor ? decodeCursor(input.cursor) : null;
	const fetchSize = limit * 4 + 1; // grouping shrinks rows; over-fetch a bit.

	const where = whereForFilter(userId, input.filter, cursor);

	const rows = await prisma.notification.findMany({
		where,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: fetchSize,
		include: NOTIFICATION_INCLUDE,
	});

	const groups = groupRows(rows);
	const page = groups.slice(0, limit);
	const hasMore = rows.length === fetchSize || groups.length > limit;

	const lastBucket = page[page.length - 1];
	const lastBucketRows = lastBucket ? bucketRows(lastBucket) : [];
	const lastBucketTailRow = lastBucketRows[lastBucketRows.length - 1];
	const nextCursor =
		hasMore && lastBucket && lastBucketTailRow
			? encodeCursor({
					createdAt: lastBucket.latestAt,
					id: lastBucketTailRow.id,
				})
			: null;

	return {
		items: page.map(bucketToGroupRow),
		metadata: { nextCursor, hasMore },
	};
}

/* ------------------------------------------------------------------ */
/* Counts                                                              */
/* ------------------------------------------------------------------ */

export async function unreadCount(
	userId: string,
): Promise<UnreadCountOutputType> {
	const [unseen, unread] = await Promise.all([
		prisma.notification.count({
			where: { recipientUserId: userId, seenAt: null },
		}),
		prisma.notification.count({
			where: { recipientUserId: userId, readAt: null },
		}),
	]);
	return { unseen, unread };
}

/* ------------------------------------------------------------------ */
/* Mark seen / read                                                    */
/* ------------------------------------------------------------------ */

export async function markAllSeen(
	userId: string,
): Promise<MarkAllSeenOutputType> {
	const now = new Date();
	const result = await prisma.notification.updateMany({
		where: { recipientUserId: userId, seenAt: null },
		data: { seenAt: now },
	});
	if (result.count > 0) {
		void publishInboxSeen(userId, now).catch((err) => {
			console.error("[markAllSeen] ably publish", err);
		});
	}
	return { ok: true as const, updated: result.count };
}

export async function markRead(
	input: MarkReadInputType,
	userId: string,
): Promise<MarkReadOutputType> {
	const now = new Date();
	const result = await prisma.notification.updateMany({
		where: {
			recipientUserId: userId,
			groupKey: input.groupKey,
			readAt: null,
		},
		data: { readAt: now, seenAt: now },
	});
	if (result.count > 0) {
		void publishInboxRead(userId, input.groupKey, now).catch((err) => {
			console.error("[markRead] ably publish", err);
		});
	}
	return { ok: true as const, updated: result.count };
}

export async function markAllRead(
	userId: string,
): Promise<MarkAllReadOutputType> {
	const now = new Date();
	const result = await prisma.notification.updateMany({
		where: { recipientUserId: userId, readAt: null },
		data: { readAt: now, seenAt: now },
	});
	if (result.count > 0) {
		void publishInboxRead(userId, null, now).catch((err) => {
			console.error("[markAllRead] ably publish", err);
		});
	}
	return { ok: true as const, updated: result.count };
}

async function publishInboxSeen(userId: string, at: Date): Promise<void> {
	const payload: InboxSeenMessage = { at: at.toISOString() };
	await ablyRest.channels
		.get(channels.userInbox(userId))
		.publish(INBOX_EVENTS.NOTIFICATION_SEEN, payload);
}

async function publishInboxRead(
	userId: string,
	groupKey: string | null,
	at: Date,
): Promise<void> {
	const payload: InboxReadMessage = { groupKey, at: at.toISOString() };
	await ablyRest.channels
		.get(channels.userInbox(userId))
		.publish(INBOX_EVENTS.NOTIFICATION_READ, payload);
}

/* ------------------------------------------------------------------ */
/* Preferences                                                         */
/* ------------------------------------------------------------------ */

export async function getPreferences(
	userId: string,
): Promise<NotificationPreferenceOutputType> {
	return getOrCreatePreferences(userId);
}

export async function updatePreferences(
	input: UpdateNotificationPreferenceInputType,
	userId: string,
): Promise<NotificationPreferenceOutputType> {
	const updated = await prisma.userNotificationPreference.upsert({
		where: { userId },
		create: { userId, ...input },
		update: input,
	});
	return toPreferenceOutput(updated);
}
