import { env } from "@xamsa/env/server";

/** Auth and transactional mails only send via Resend in production — dev logs URLs instead. */
export function shouldSendMail(): boolean {
	return env.NODE_ENV === "production";
}

/** Product notification emails (follow, game winner): production, or dev when `SEND_NOTIFICATION_EMAIL_IN_DEV=true`. */
export function shouldSendNotificationMail(): boolean {
	if (env.NODE_ENV === "production") return true;
	return env.SEND_NOTIFICATION_EMAIL_IN_DEV === "true";
}
