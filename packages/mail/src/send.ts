import { EmailParams, Recipient } from "mailersend";
import { mailer, sentFrom } from "./client";

type EmailTo =
	| string
	| {
			name: string;
			email: string;
	  };
interface SendEmailOptions {
	to: EmailTo | EmailTo[];
	subject: string;
	html: string;
}

const getRecipient = (to: EmailTo) => {
	if (typeof to === "string") {
		return new Recipient(to);
	}

	return new Recipient(to.email, to.name);
};

export async function sendEmail(options: SendEmailOptions) {
	const { to, subject, html } = options;

	const recipients = Array.isArray(to)
		? to.map(getRecipient)
		: [getRecipient(to)];

	const emailParams = new EmailParams()
		.setFrom(sentFrom)
		.setTo(recipients)
		.setSubject(subject)
		.setHtml(html);

	try {
		return await mailer.email.send(emailParams);
	} catch (error) {
		console.error("Failed to send email", emailParams, error);
		throw error;
	}
}
