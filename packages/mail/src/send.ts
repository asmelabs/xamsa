import { EmailParams, Recipient } from "mailersend";
import { mailer, sentFrom } from "./client";
import { summarizeMailDeliveryError, truncateForLog } from "./mail-send-errors";

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
		const toAddresses = recipients.map((r) => r.email);
		const readable = summarizeMailDeliveryError(error);
		const status =
			error && typeof error === "object" && "statusCode" in error
				? (error as { statusCode?: number }).statusCode
				: undefined;

		console.error("[@xamsa/mail] Email send rejected:", readable, {
			to: toAddresses,
			subject,
			htmlPreview: truncateForLog(html),
			statusCode: status,
		});
		throw Object.assign(new Error(readable), { cause: error });
	}
}
