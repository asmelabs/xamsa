import { env } from "@xamsa/env/server";
import type { CreateEmailOptions } from "resend";
import { resend } from "./client";

const from = `Xamsa <${env.EMAIL_FROM}>`;

export async function sendEmail(payload: CreateEmailOptions) {
	const { data, error } = await resend.emails.send({
		from,
		...payload,
	});

	if (error) {
		throw new Error(error.message);
	}

	return data;
}

export async function sendBatchEmails(
	payload: Omit<CreateEmailOptions, "attachments" | "scheduledAt" | "from">[],
) {
	const { data, error } = await resend.batch.send(
		payload.map((p) => ({
			from,
			...p,
		})),
	);

	if (error) {
		throw new Error(error.message);
	}

	return data;
}
