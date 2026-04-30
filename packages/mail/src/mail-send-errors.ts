/**
 * Parses MailerSend (and loose) rejection payloads so failures are actionable in logs —
 * Better Auth intentionally does not surface `sendVerificationEmail` errors to HTTP clients.
 */
export function summarizeMailDeliveryError(error: unknown): string {
	const apiMessage = extractApiBodyMessage(error);
	if (apiMessage && /MS42225|unique recipients/i.test(apiMessage)) {
		return `${apiMessage} — Note: this is a separate cap on how many distinct addresses you can send to on a trial sender domain; dashboard “emails left” is usually total sends, not unique recipients.`;
	}
	const fromError =
		error instanceof Error && error.message.trim() !== ""
			? error.message
			: undefined;
	const fallback = apiMessage ?? fromError ?? String(error ?? "unknown_error");
	return fallback;
}

export function truncateForLog(html: string, max = 80): string {
	const oneLine = html.replace(/\s+/g, " ").trim();
	return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

function extractApiBodyMessage(error: unknown): string | undefined {
	if (!error || typeof error !== "object") return undefined;
	const o = error as {
		body?: { message?: unknown };
		responseBody?: { message?: unknown };
		message?: unknown;
	};
	if (typeof o.body?.message === "string") return o.body.message;
	if (typeof o.responseBody?.message === "string")
		return o.responseBody.message;
	if (typeof o.message === "string") return o.message;
	return undefined;
}
