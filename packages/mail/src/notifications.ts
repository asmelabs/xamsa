import { SITE_URL, transactionalFooterLinks } from "./footer-links";
import { shouldSendNotificationMail } from "./mail-env";
import { sendEmail } from "./send";
import { buildTransactionalHtml, escapeHtml } from "./templates/email-layout";
export async function sendGameWinnerEmail(params: {
	email: string;
	name: string;
	packName?: string | null;
	profileUsername: string;
}) {
	const { email, name, packName, profileUsername } = params;
	const profileUrl = `${SITE_URL}/u/${encodeURIComponent(profileUsername)}`;
	const subtitle = packName
		? `Nice work on winning with pack <strong>${escapeHtml(packName)}</strong>.`
		: "You finished ahead of everyone in this round.";
	const html = buildTransactionalHtml({
		title: "You won!",
		introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;">${subtitle}</p>
<p style="margin:0;font-size:13px;color:#545454;">Keep playing to climb the leaderboard and earn more badges.</p>
`,
		primaryButton: { href: profileUrl, label: "View your profile" },
		footerLinks: transactionalFooterLinks(),
	});
	if (!shouldSendNotificationMail()) {
		console.log("=== game winner email (dev) ===");
		console.log("To:", email);
		return;
	}
	await sendEmail({
		to: { email, name },
		subject: "Congrats — you won a Xamsa game!",
		html,
	});
}

export async function sendNewFollowerEmail(params: {
	email: string;
	name: string;
	followerName: string;
	followerUsername: string;
}) {
	const { email, name, followerName, followerUsername } = params;
	const followerUrl = `${SITE_URL}/u/${encodeURIComponent(followerUsername)}`;
	const html = buildTransactionalHtml({
		title: "New follower on Xamsa",
		introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;"><strong>${escapeHtml(followerName)}</strong> (@${escapeHtml(followerUsername)}) started following you.</p>
`,
		primaryButton: { href: followerUrl, label: "View their profile" },
		footerLinks: transactionalFooterLinks(),
	});
	if (!shouldSendNotificationMail()) {
		console.log("=== new follower email (dev) ===");
		console.log("To:", email);
		return;
	}
	await sendEmail({
		to: { email, name },
		subject: `${followerName} followed you on Xamsa`,
		html,
	});
}

/** Mention alerts; deduped in API via mention_email_notification within a short window per post. */
export async function sendMentionEmail(params: {
	email: string;
	name: string;
	actorName: string;
	contextLine: string;
	href: string;
}) {
	const { email, name, actorName, contextLine, href } = params;
	const html = buildTransactionalHtml({
		title: "You were mentioned on Xamsa",
		introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;"><strong>${escapeHtml(actorName)}</strong> mentioned you: ${escapeHtml(contextLine)}</p>
`,
		primaryButton: { href, label: "Open the conversation" },
		footerLinks: transactionalFooterLinks(),
	});
	if (!shouldSendNotificationMail()) {
		console.log("=== mention email (dev) ===");
		console.log("To:", email);
		console.log("Link:", href);
		return;
	}
	await sendEmail({
		to: { email, name },
		subject: `${actorName} mentioned you on Xamsa`,
		html,
	});
}

/** Reaction-on-post alerts; deduped in API via reaction_email_notification within a short window per post. */
export async function sendReactionEmail(params: {
	email: string;
	name: string;
	actorName: string;
	reactionEmoji: string;
	postSnippet: string;
	href: string;
}) {
	const { email, name, actorName, reactionEmoji, postSnippet, href } = params;
	const html = buildTransactionalHtml({
		title: "Someone reacted to your post",
		introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;"><strong>${escapeHtml(actorName)}</strong> reacted ${escapeHtml(reactionEmoji)} to your post: ${escapeHtml(postSnippet)}</p>
`,
		primaryButton: { href, label: "Open the post" },
		footerLinks: transactionalFooterLinks(),
	});
	if (!shouldSendNotificationMail()) {
		console.log("=== reaction email (dev) ===");
		console.log("To:", email);
		console.log("Link:", href);
		return;
	}
	await sendEmail({
		to: { email, name },
		subject: `${actorName} reacted to your post on Xamsa`,
		html,
	});
}

/** Top-level comment-on-post alerts; deduped in API via comment_email_notification within a short window per post. */
export async function sendCommentEmail(params: {
	email: string;
	name: string;
	actorName: string;
	postSnippet: string;
	commentSnippet: string;
	href: string;
}) {
	const { email, name, actorName, postSnippet, commentSnippet, href } = params;
	const html = buildTransactionalHtml({
		title: "New comment on your post",
		introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;"><strong>${escapeHtml(actorName)}</strong> commented on your post: ${escapeHtml(postSnippet)}</p>
<p style="margin:0 0 12px;color:#545454;">"${escapeHtml(commentSnippet)}"</p>
`,
		primaryButton: { href, label: "Open the conversation" },
		footerLinks: transactionalFooterLinks(),
	});
	if (!shouldSendNotificationMail()) {
		console.log("=== comment email (dev) ===");
		console.log("To:", email);
		console.log("Link:", href);
		return;
	}
	await sendEmail({
		to: { email, name },
		subject: `${actorName} commented on your post on Xamsa`,
		html,
	});
}

/** Reply-to-comment alerts; deduped in API via reply_email_notification within a short window per parent comment. */
export async function sendReplyEmail(params: {
	email: string;
	name: string;
	actorName: string;
	parentSnippet: string;
	replySnippet: string;
	href: string;
}) {
	const { email, name, actorName, parentSnippet, replySnippet, href } = params;
	const html = buildTransactionalHtml({
		title: "New reply to your comment",
		introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;"><strong>${escapeHtml(actorName)}</strong> replied to your comment: ${escapeHtml(parentSnippet)}</p>
<p style="margin:0 0 12px;color:#545454;">"${escapeHtml(replySnippet)}"</p>
`,
		primaryButton: { href, label: "Open the conversation" },
		footerLinks: transactionalFooterLinks(),
	});
	if (!shouldSendNotificationMail()) {
		console.log("=== reply email (dev) ===");
		console.log("To:", email);
		console.log("Link:", href);
		return;
	}
	await sendEmail({
		to: { email, name },
		subject: `${actorName} replied to your comment on Xamsa`,
		html,
	});
}
