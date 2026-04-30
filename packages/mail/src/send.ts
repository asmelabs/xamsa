import { mailFrom, resend } from "./client";
import { summarizeMailDeliveryError, truncateForLog } from "./mail-send-errors";

type EmailTo =
	| string
	| {
			name: string;
			email: string;
	  };

/** Matches Resend dashboard templates — `variables` are substituted into the template. */
export type ResendEmailTemplate = {
	id: string;
	variables?: Record<string, string | number>;
};

type SendEmailOptionsHtml = {
	to: EmailTo | EmailTo[];
	subject: string;
	html: string;
	template?: undefined;
};

type SendEmailOptionsTemplate = {
	to: EmailTo | EmailTo[];
	template: ResendEmailTemplate;
	subject?: string;
	html?: undefined;
};

export type SendEmailOptions = SendEmailOptionsHtml | SendEmailOptionsTemplate;

const formatToHeader = (to: EmailTo): string => {
	if (typeof to === "string") return to;
	const name = to.name.trim();
	if (!name) return to.email;
	if (/[",;<>]/.test(name)) {
		return `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}" <${to.email}>`;
	}
	return `${name} <${to.email}>`;
};

const recipientEmails = (to: EmailTo | EmailTo[]): string[] => {
	const list = Array.isArray(to) ? to : [to];
	return list.map((t) => (typeof t === "string" ? t : t.email));
};

function isTemplateSend(
	options: SendEmailOptions,
): options is SendEmailOptionsTemplate {
	return "template" in options && options.template !== undefined;
}

function contentPreview(options: SendEmailOptions): string {
	if (isTemplateSend(options)) {
		const v = options.template.variables;
		const keys =
			v && Object.keys(v).length > 0 ? ` (${Object.keys(v).join(", ")})` : "";
		return `template:${options.template.id}${keys}`;
	}
	return truncateForLog(options.html);
}

export async function sendEmail(options: SendEmailOptions) {
	const { to } = options;

	const toHeaders = Array.isArray(to)
		? to.map(formatToHeader)
		: [formatToHeader(to)];
	const toAddresses = recipientEmails(to);

	try {
		const toField: string | string[] =
			toHeaders.length === 1 ? (toHeaders[0] ?? "") : toHeaders;

		const { data, error } = await resend.emails.send(
			isTemplateSend(options)
				? {
						from: mailFrom,
						to: toField,
						...(options.subject !== undefined
							? { subject: options.subject }
							: {}),
						template: options.template,
					}
				: {
						from: mailFrom,
						to: toField,
						subject: options.subject,
						html: options.html,
					},
		);

		if (error) {
			const readable = summarizeMailDeliveryError(error);
			console.error("[@xamsa/mail] Email send rejected:", readable, {
				to: toAddresses,
				subject: options.subject,
				contentPreview: contentPreview(options),
				statusCode: error.statusCode ?? undefined,
			});
			throw Object.assign(new Error(readable), { cause: error });
		}

		return data;
	} catch (error) {
		const cause = error instanceof Error ? error.cause : undefined;
		if (
			cause &&
			typeof cause === "object" &&
			"name" in cause &&
			"message" in cause
		) {
			throw error;
		}

		const readable = summarizeMailDeliveryError(error);
		const status =
			error && typeof error === "object" && "statusCode" in error
				? (error as { statusCode?: number }).statusCode
				: undefined;

		console.error("[@xamsa/mail] Email send rejected:", readable, {
			to: toAddresses,
			subject: options.subject,
			contentPreview: contentPreview(options),
			statusCode: status,
		});
		throw Object.assign(new Error(readable), { cause: error });
	}
}
