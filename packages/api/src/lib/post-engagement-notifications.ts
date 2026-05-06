import prisma from "@xamsa/db";
import { SITE_URL } from "@xamsa/mail/footer-links";
import { shouldSendNotificationMail } from "@xamsa/mail/mail-env";
import {
	sendCommentEmail,
	sendReactionEmail,
	sendReplyEmail,
} from "@xamsa/mail/notifications";
import { shouldSendCategoryEmail } from "../modules/notification/email-gate";

/** Burst dedupe window matching mention emails (15 minutes). */
const ENGAGEMENT_EMAIL_DEDUPE_MS = 15 * 60 * 1000;

const REACTION_EMOJI: Record<string, string> = {
	heart: "❤️",
	dislike: "👎",
	laugh: "😂",
	sad: "😢",
	angry: "😡",
	wow: "😮",
};

function excerptLine(body: string | null | undefined, max = 120): string {
	const t = (body ?? "").replace(/\s+/g, " ").trim();
	if (!t) {
		return "";
	}
	if (t.length <= max) {
		return t;
	}
	return `${t.slice(0, max - 1)}…`;
}

function postHref(postSlug: string, commentId?: string | null): string {
	const path = `/p/${encodeURIComponent(postSlug)}/`;
	const hash = commentId ? `#c-${commentId}` : "";
	return `${SITE_URL}${path}${hash}`;
}

/**
 * Email the post owner that someone reacted to their post. Skipped when
 * the actor is the post owner, the recipient's email isn't verified, or a
 * recent reaction email for the same post landed within the dedupe window.
 */
export async function notifyReactionEmail(params: {
	postId: string;
	actorUserId: string;
}): Promise<void> {
	const post = await prisma.post.findUnique({
		where: { id: params.postId },
		select: {
			id: true,
			slug: true,
			body: true,
			userId: true,
		},
	});
	if (!post) return;
	if (post.userId === params.actorUserId) return;

	const recipient = await prisma.user.findUnique({
		where: { id: post.userId },
		select: { id: true, email: true, name: true, emailVerified: true },
	});
	if (!recipient?.emailVerified) return;

	const allowed = await shouldSendCategoryEmail({
		recipientUserId: recipient.id,
		actorUserId: params.actorUserId,
		category: "reactionOnPost",
	});
	if (!allowed) return;

	const recent = await prisma.reactionEmailNotification.findFirst({
		where: {
			recipientUserId: recipient.id,
			postId: post.id,
			sentAt: { gte: new Date(Date.now() - ENGAGEMENT_EMAIL_DEDUPE_MS) },
		},
		select: { id: true },
	});
	if (recent) return;

	const actor = await prisma.user.findUnique({
		where: { id: params.actorUserId },
		select: { name: true, username: true },
	});
	if (!actor) return;
	const actorName = actor.name.trim().length > 0 ? actor.name : actor.username;

	const reactionRow = await prisma.reaction.findFirst({
		where: { postId: post.id, userId: params.actorUserId },
		select: { type: true },
	});
	const reactionEmoji = REACTION_EMOJI[reactionRow?.type ?? ""] ?? "👀";

	try {
		await sendReactionEmail({
			email: recipient.email,
			name: recipient.name,
			actorName,
			reactionEmoji,
			postSnippet: excerptLine(post.body, 80) || "your post",
			href: postHref(post.slug),
		});
	} catch (e) {
		console.error("[notifyReactionEmail]", e);
		return;
	}

	if (shouldSendNotificationMail()) {
		await prisma.reactionEmailNotification.create({
			data: { recipientUserId: recipient.id, postId: post.id },
		});
	}
}

/**
 * Email the post owner about a top-level (depth 0) comment on their post.
 */
export async function notifyCommentEmail(params: {
	postId: string;
	commentId: string;
	commentBody: string;
	actorUserId: string;
}): Promise<void> {
	const post = await prisma.post.findUnique({
		where: { id: params.postId },
		select: {
			id: true,
			slug: true,
			body: true,
			userId: true,
		},
	});
	if (!post) return;
	if (post.userId === params.actorUserId) return;

	const recipient = await prisma.user.findUnique({
		where: { id: post.userId },
		select: { id: true, email: true, name: true, emailVerified: true },
	});
	if (!recipient?.emailVerified) return;

	const allowed = await shouldSendCategoryEmail({
		recipientUserId: recipient.id,
		actorUserId: params.actorUserId,
		category: "commentOnPost",
	});
	if (!allowed) return;

	const recent = await prisma.commentEmailNotification.findFirst({
		where: {
			recipientUserId: recipient.id,
			postId: post.id,
			sentAt: { gte: new Date(Date.now() - ENGAGEMENT_EMAIL_DEDUPE_MS) },
		},
		select: { id: true },
	});
	if (recent) return;

	const actor = await prisma.user.findUnique({
		where: { id: params.actorUserId },
		select: { name: true, username: true },
	});
	if (!actor) return;
	const actorName = actor.name.trim().length > 0 ? actor.name : actor.username;

	try {
		await sendCommentEmail({
			email: recipient.email,
			name: recipient.name,
			actorName,
			postSnippet: excerptLine(post.body, 80) || "your post",
			commentSnippet: excerptLine(params.commentBody, 160),
			href: postHref(post.slug, params.commentId),
		});
	} catch (e) {
		console.error("[notifyCommentEmail]", e);
		return;
	}

	if (shouldSendNotificationMail()) {
		await prisma.commentEmailNotification.create({
			data: { recipientUserId: recipient.id, postId: post.id },
		});
	}
}

/**
 * Email the parent comment's author when someone replies to them.
 */
export async function notifyReplyEmail(params: {
	parentCommentId: string;
	replyCommentId: string;
	replyBody: string;
	actorUserId: string;
}): Promise<void> {
	const parent = await prisma.comment.findUnique({
		where: { id: params.parentCommentId },
		select: {
			id: true,
			body: true,
			userId: true,
			postId: true,
			post: { select: { slug: true } },
		},
	});
	if (!parent) return;
	if (parent.userId === params.actorUserId) return;

	const recipient = await prisma.user.findUnique({
		where: { id: parent.userId },
		select: { id: true, email: true, name: true, emailVerified: true },
	});
	if (!recipient?.emailVerified) return;

	const allowed = await shouldSendCategoryEmail({
		recipientUserId: recipient.id,
		actorUserId: params.actorUserId,
		category: "replyToComment",
	});
	if (!allowed) return;

	const recent = await prisma.replyEmailNotification.findFirst({
		where: {
			recipientUserId: recipient.id,
			parentCommentId: parent.id,
			sentAt: { gte: new Date(Date.now() - ENGAGEMENT_EMAIL_DEDUPE_MS) },
		},
		select: { id: true },
	});
	if (recent) return;

	const actor = await prisma.user.findUnique({
		where: { id: params.actorUserId },
		select: { name: true, username: true },
	});
	if (!actor) return;
	const actorName = actor.name.trim().length > 0 ? actor.name : actor.username;

	const href = parent.post?.slug
		? postHref(parent.post.slug, params.replyCommentId)
		: SITE_URL;

	try {
		await sendReplyEmail({
			email: recipient.email,
			name: recipient.name,
			actorName,
			parentSnippet: excerptLine(parent.body, 120) || "your comment",
			replySnippet: excerptLine(params.replyBody, 160),
			href,
		});
	} catch (e) {
		console.error("[notifyReplyEmail]", e);
		return;
	}

	if (shouldSendNotificationMail()) {
		await prisma.replyEmailNotification.create({
			data: {
				recipientUserId: recipient.id,
				parentCommentId: parent.id,
			},
		});
	}
}
