import prisma from "@xamsa/db";
import type { NotificationDeliveryLevel } from "@xamsa/schemas/db/schemas/enums/NotificationDeliveryLevel.schema";
import { createNotification } from "./create";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Resolve a single yes/no decision for a `level`-style preference.
 * `all` = always send, `none` = never, `followers` = only when the
 * recipient follows the actor.
 *
 * `actorUserId` may be null for system-originated events; in that case
 * `followers` is treated as "no" (we don't have an actor to evaluate
 * the relationship against).
 */
async function shouldDeliverByLevel(
	level: NotificationDeliveryLevel,
	recipientUserId: string,
	actorUserId: string | null,
): Promise<boolean> {
	if (level === "all") return true;
	if (level === "none") return false;
	if (!actorUserId) return false;
	const row = await prisma.userFollow.findUnique({
		where: {
			followerId_followingId: {
				followerId: recipientUserId,
				followingId: actorUserId,
			},
		},
		select: { id: true },
	});
	return row != null;
}

/**
 * Read-or-create the prefs row for `userId`. Inline upsert lets every
 * dispatcher branch on a complete, well-typed row even for users who
 * haven't visited the settings page yet.
 */
async function loadPrefsForRecipient(userId: string) {
	return prisma.userNotificationPreference.upsert({
		where: { userId },
		create: { userId },
		update: {},
	});
}

/* ------------------------------------------------------------------ */
/* Mention                                                             */
/* ------------------------------------------------------------------ */

export async function notifyMention(params: {
	mentionedUserIds: readonly string[];
	actorUserId: string;
	source: "post" | "comment";
	postId?: string;
	commentId?: string;
}): Promise<void> {
	const ids = [...new Set(params.mentionedUserIds)].filter(
		(id) => id !== params.actorUserId,
	);
	if (ids.length === 0) return;

	const subjectRef =
		params.source === "post" ? params.postId : params.commentId;
	if (!subjectRef) return;

	const groupKey = `mention:${params.source}:${subjectRef}`;

	for (const recipientUserId of ids) {
		const prefs = await loadPrefsForRecipient(recipientUserId);
		if (prefs.muteAllExceptSecurity) continue;
		const ok = await shouldDeliverByLevel(
			prefs.mentionInApp,
			recipientUserId,
			params.actorUserId,
		);
		if (!ok) continue;
		await createNotification({
			type: params.source === "post" ? "mention_post" : "mention_comment",
			recipientUserId,
			actorUserId: params.actorUserId,
			groupKey,
			postId: params.postId ?? null,
			commentId: params.commentId ?? null,
			skipIfExistsWithinMs: 60_000,
		});
	}
}

/* ------------------------------------------------------------------ */
/* Reaction (post or comment)                                          */
/* ------------------------------------------------------------------ */

export async function notifyReaction(params: {
	postId?: string;
	commentId?: string;
	actorUserId: string;
}): Promise<void> {
	if (params.postId) {
		const post = await prisma.post.findUnique({
			where: { id: params.postId },
			select: { userId: true },
		});
		if (!post || post.userId === params.actorUserId) return;
		const prefs = await loadPrefsForRecipient(post.userId);
		if (prefs.muteAllExceptSecurity) return;
		const ok = await shouldDeliverByLevel(
			prefs.reactionOnPostInApp,
			post.userId,
			params.actorUserId,
		);
		if (!ok) return;
		await createNotification({
			type: "reaction_post",
			recipientUserId: post.userId,
			actorUserId: params.actorUserId,
			groupKey: `reaction:post:${params.postId}`,
			postId: params.postId,
			skipIfExistsWithinMs: 30_000,
		});
		return;
	}
	if (params.commentId) {
		const comment = await prisma.comment.findUnique({
			where: { id: params.commentId },
			select: { userId: true, postId: true },
		});
		if (!comment || comment.userId === params.actorUserId) return;
		const prefs = await loadPrefsForRecipient(comment.userId);
		if (prefs.muteAllExceptSecurity) return;
		const ok = await shouldDeliverByLevel(
			prefs.reactionOnCommentInApp,
			comment.userId,
			params.actorUserId,
		);
		if (!ok) return;
		await createNotification({
			type: "reaction_comment",
			recipientUserId: comment.userId,
			actorUserId: params.actorUserId,
			groupKey: `reaction:comment:${params.commentId}`,
			commentId: params.commentId,
			postId: comment.postId,
			skipIfExistsWithinMs: 30_000,
		});
	}
}

/* ------------------------------------------------------------------ */
/* Comment on post (top-level)                                         */
/* ------------------------------------------------------------------ */

export async function notifyCommentOnPost(params: {
	postId: string;
	commentId: string;
	actorUserId: string;
}): Promise<void> {
	const post = await prisma.post.findUnique({
		where: { id: params.postId },
		select: { userId: true },
	});
	if (!post || post.userId === params.actorUserId) return;
	const prefs = await loadPrefsForRecipient(post.userId);
	if (prefs.muteAllExceptSecurity) return;
	const ok = await shouldDeliverByLevel(
		prefs.commentOnPostInApp,
		post.userId,
		params.actorUserId,
	);
	if (!ok) return;
	await createNotification({
		type: "comment_on_post",
		recipientUserId: post.userId,
		actorUserId: params.actorUserId,
		groupKey: `comment_on_post:${params.postId}`,
		postId: params.postId,
		commentId: params.commentId,
	});
}

/* ------------------------------------------------------------------ */
/* Reply to a comment                                                  */
/* ------------------------------------------------------------------ */

export async function notifyReply(params: {
	parentCommentId: string;
	replyCommentId: string;
	actorUserId: string;
}): Promise<void> {
	const parent = await prisma.comment.findUnique({
		where: { id: params.parentCommentId },
		select: { userId: true, postId: true },
	});
	if (!parent || parent.userId === params.actorUserId) return;
	const prefs = await loadPrefsForRecipient(parent.userId);
	if (prefs.muteAllExceptSecurity) return;
	const ok = await shouldDeliverByLevel(
		prefs.replyToCommentInApp,
		parent.userId,
		params.actorUserId,
	);
	if (!ok) return;
	await createNotification({
		type: "reply_to_comment",
		recipientUserId: parent.userId,
		actorUserId: params.actorUserId,
		groupKey: `reply_to_comment:${params.parentCommentId}`,
		commentId: params.replyCommentId,
		postId: parent.postId,
	});
}

/* ------------------------------------------------------------------ */
/* Follow                                                              */
/* ------------------------------------------------------------------ */

export async function notifyFollow(params: {
	recipientUserId: string;
	actorUserId: string;
}): Promise<void> {
	if (params.recipientUserId === params.actorUserId) return;
	const prefs = await loadPrefsForRecipient(params.recipientUserId);
	if (prefs.muteAllExceptSecurity) return;
	if (!prefs.followInApp) return;
	await createNotification({
		type: "follow",
		recipientUserId: params.recipientUserId,
		actorUserId: params.actorUserId,
		// Follows from many actors collapse into a single group per recipient.
		groupKey: `follow:${params.recipientUserId}`,
	});
}

/* ------------------------------------------------------------------ */
/* Pack publish — fan out to followers                                 */
/* ------------------------------------------------------------------ */

const PACK_PUBLISH_FANOUT_LIMIT = 5_000;

export async function notifyPackPublished(params: {
	packId: string;
	authorUserId: string;
}): Promise<void> {
	const followers = await prisma.userFollow.findMany({
		where: { followingId: params.authorUserId, status: "accepted" },
		select: { followerId: true },
		take: PACK_PUBLISH_FANOUT_LIMIT,
	});
	if (followers.length === 0) return;

	const groupKey = `pack_published:${params.packId}`;

	for (const f of followers) {
		const prefs = await loadPrefsForRecipient(f.followerId);
		if (prefs.muteAllExceptSecurity) continue;
		if (!prefs.packPublishedInApp) continue;
		await createNotification({
			type: "pack_published",
			recipientUserId: f.followerId,
			actorUserId: params.authorUserId,
			groupKey,
			packId: params.packId,
			skipIfExistsWithinMs: 60_000,
		});
	}
}

/* ------------------------------------------------------------------ */
/* Game started — fan out to host's followers (unless already in lobby) */
/* ------------------------------------------------------------------ */

const GAME_START_FANOUT_LIMIT = 2_000;

export async function notifyGameStarted(params: {
	gameId: string;
	hostUserId: string;
}): Promise<void> {
	const followers = await prisma.userFollow.findMany({
		where: { followingId: params.hostUserId, status: "accepted" },
		select: { followerId: true },
		take: GAME_START_FANOUT_LIMIT,
	});
	if (followers.length === 0) return;

	const recipientIds = followers.map((f) => f.followerId);
	const inLobby = await prisma.player.findMany({
		where: {
			gameId: params.gameId,
			userId: { in: recipientIds },
		},
		select: { userId: true },
	});
	const inLobbySet = new Set(inLobby.map((p) => p.userId));

	const groupKey = `game_started:${params.gameId}`;

	for (const recipientUserId of recipientIds) {
		if (inLobbySet.has(recipientUserId)) continue;
		const prefs = await loadPrefsForRecipient(recipientUserId);
		if (prefs.muteAllExceptSecurity) continue;
		if (!prefs.gameStartedInApp) continue;
		await createNotification({
			type: "game_started",
			recipientUserId,
			actorUserId: params.hostUserId,
			groupKey,
			gameId: params.gameId,
		});
	}
}

/* ------------------------------------------------------------------ */
/* Game finished — notify host + every player who participated         */
/* ------------------------------------------------------------------ */

export async function notifyGameFinished(params: {
	gameId: string;
}): Promise<void> {
	const game = await prisma.game.findUnique({
		where: { id: params.gameId },
		select: {
			hostId: true,
			players: { select: { userId: true } },
		},
	});
	if (!game) return;

	// One row per recipient — host + each unique player. Actor is null
	// (this is a system-originated event from the game lifecycle).
	const recipientIds = new Set<string>([
		game.hostId,
		...game.players.map((p) => p.userId),
	]);

	const groupKey = `game_finished:${params.gameId}`;

	for (const recipientUserId of recipientIds) {
		const prefs = await loadPrefsForRecipient(recipientUserId);
		if (prefs.muteAllExceptSecurity) continue;
		if (!prefs.gameFinishedInApp) continue;
		await createNotification({
			type: "game_finished",
			recipientUserId,
			actorUserId: null,
			groupKey,
			gameId: params.gameId,
		});
	}
}
