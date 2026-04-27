import { sendEmail } from "./send";

export async function sendEmailVerificationEmail(
	email: string,
	name: string,
	url: string,
) {
	await sendEmail({
		to: {
			email,
			name,
		},
		subject: "Verify your email",
		html: `
		<p>Hello ${name},</p>
		<p>Please click the link below to verify your email:</p>
		<p><a href="${url}">Verify your email</a></p>
		<p>If you did not request this verification, please ignore this email.</p>
		<p>Thank you,</p>
		<p>The Xamsa team</p>
		`,
	});
}

export async function sendPasswordResetEmail(
	email: string,
	name: string,
	url: string,
) {
	await sendEmail({
		to: {
			email,
			name,
		},
		subject: "Reset your password",
		html: `
		<p>Hello ${name},</p>
		<p>Please click the link below to reset your password:</p>
		<p><a href="${url}">Reset your password</a></p>
		<p>If you did not request this password reset, please ignore this email.</p>
		<p>Thank you,</p>
		<p>The Xamsa team</p>
		`,
	});
}
