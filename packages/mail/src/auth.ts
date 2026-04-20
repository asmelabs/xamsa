import { env } from "@xamsa/env/server";
import { resend } from "./client";

export async function sendEmailVerificationEmail(
	name: string,
	email: string,
	url: string,
) {
	const { data, error } = await resend.emails.send({
		from: `Xamsa <${env.EMAIL_FROM}>`,
		to: email,
		subject: "Verify your email",
		text: `Hello ${name},
    Please click the link below to verify your email:
    ${url}
    If you did not request this verification, please ignore this email.
    Thank you,
    The Xamsa team
    `,
	});

	if (error) {
		throw new Error(error.message);
	}

	return data;
}
