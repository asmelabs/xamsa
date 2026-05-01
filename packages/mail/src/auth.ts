import { transactionalFooterLinks } from "./footer-links";
import { shouldSendMail } from "./mail-env";
import { sendEmail } from "./send";
import {
	buildTransactionalHtml,
	type EmailLayoutOptions,
	escapeHtml,
} from "./templates/email-layout";

function layoutBase(
	partial: Pick<EmailLayoutOptions, "title" | "introHtml" | "primaryButton">,
): EmailLayoutOptions {
	return {
		...partial,
		footerLinks: transactionalFooterLinks(),
	};
}

export async function sendEmailVerificationEmail(
	email: string,
	name: string,
	url: string,
) {
	const html = buildTransactionalHtml(
		layoutBase({
			title: "Verify your email",
			introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;">Please confirm your email address to finish securing your Xamsa account.</p>
<p style="margin:0;font-size:13px;color:#545454;">If you did not create an account, you can ignore this message.</p>
`,
			primaryButton: { href: url, label: "Verify email" },
		}),
	);

	// if (!shouldSendMail()) {
	// 	console.log("=== verify email (dev) ===");
	// 	console.log("To:", email);
	// 	console.log("URL:", url);
	// 	return;
	// }

	await sendEmail({
		to: { email, name },
		subject: "Verify your email",
		html,
	});
}

export async function sendPasswordResetEmail(
	email: string,
	name: string,
	url: string,
) {
	const html = buildTransactionalHtml(
		layoutBase({
			title: "Reset your password",
			introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;">We received a request to reset the password for this account. Use the button below to choose a new password.</p>
<p style="margin:0;font-size:13px;color:#545454;">If you did not ask for this, you can safely ignore this email.</p>
`,
			primaryButton: { href: url, label: "Reset password" },
		}),
	);
	if (!shouldSendMail()) {
		console.log("=== password reset (dev) ===");
		console.log("To:", email);
		console.log("URL:", url);
		return;
	}
	await sendEmail({
		to: { email, name },
		subject: "Reset your password",
		html,
	});
}

/** Sent when a verified user requests an email change — link sent to the *new* address. */
export async function sendEmailChangeConfirmationEmail(params: {
	newEmail: string;
	name: string;
	url: string;
	previousEmail: string;
}) {
	const { newEmail, name, url, previousEmail } = params;
	const html = buildTransactionalHtml(
		layoutBase({
			title: "Confirm your new email",
			introHtml: `
<p style="margin:0 0 12px;">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 12px;">You asked to update the email on your Xamsa account from <strong>${escapeHtml(previousEmail)}</strong> to <strong>${escapeHtml(newEmail)}</strong>.</p>
<p style="margin:0 0 12px;">Confirm this change by tapping the button below. Until you confirm, your sign-in email stays the previous one.</p>
<p style="margin:0;font-size:13px;color:#545454;">If this wasn’t you, change your password and contact support.</p>
`,
			primaryButton: { href: url, label: "Confirm new email" },
		}),
	);
	if (!shouldSendMail()) {
		console.log("=== change-email confirmation (dev) ===");
		console.log("To (new):", newEmail);
		console.log("URL:", url);
		return;
	}
	await sendEmail({
		to: { email: newEmail, name },
		subject: "Confirm your new Xamsa email",
		html,
	});
}
