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
