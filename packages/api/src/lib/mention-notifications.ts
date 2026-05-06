import prisma from "@xamsa/db";
import { SITE_URL } from "@xamsa/mail/footer-links";
import { shouldSendNotificationMail } from "@xamsa/mail/mail-env";
import { sendMentionEmail } from "@xamsa/mail/notifications";
import { shouldSendCategoryEmail } from "../modules/notification/email-gate";

/** Burst dedupe: skip another mention email to the same inbox about the same post in this window. */
const MENTION_EMAIL_DEDUPE_MS = 15 * 60 * 1000;

function excerptLine(body: string, max = 120): string {
	const t = body.replace(/\s+/g, " ").trim();
	if (t.length <= max) {
		return t;
	}
	return `${t.slice(0, max - 1)}…`;
}

export async function notifyMentionedUsersForContent(params: {
	postId: string;
	postSlug: string;
	actorUserId: string;
	actorDisplayName: string;
	mentionedUserIds: string[];
	source: "post" | "comment";
	body: string;
	commentId?: string;
}): Promise<void> {
	const ids = [...new Set(params.mentionedUserIds)].filter(
		(id) => id !== params.actorUserId,
	);
	if (ids.length === 0) {
		return;
	}

	const recipients = await prisma.user.findMany({
		where: {
			id: { in: ids },
			emailVerified: true,
		},
		select: { id: true, email: true, name: true },
	});

	const path = `/p/${encodeURIComponent(params.postSlug)}/`;
	const hash = params.commentId ? `#c-${params.commentId}` : "";
	const href = `${SITE_URL}${path}${hash}`;

	const contextLine =
		params.source === "post"
			? excerptLine(params.body || "New post")
			: excerptLine(params.body);

	const recordDedupe = shouldSendNotificationMail();

	for (const r of recipients) {
		const allowed = await shouldSendCategoryEmail({
			recipientUserId: r.id,
			actorUserId: params.actorUserId,
			category: "mention",
		});
		if (!allowed) {
			continue;
		}

		const recent = await prisma.mentionEmailNotification.findFirst({
			where: {
				recipientUserId: r.id,
				postId: params.postId,
				sentAt: { gte: new Date(Date.now() - MENTION_EMAIL_DEDUPE_MS) },
			},
		});
		if (recent) {
			continue;
		}

		try {
			await sendMentionEmail({
				email: r.email,
				name: r.name,
				actorName: params.actorDisplayName,
				contextLine,
				href,
			});
		} catch (e) {
			console.error("[notifyMentionedUsersForContent]", e);
			continue;
		}

		if (recordDedupe) {
			await prisma.mentionEmailNotification.create({
				data: { recipientUserId: r.id, postId: params.postId },
			});
		}
	}
}
