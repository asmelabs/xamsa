import { env } from "@xamsa/env/server";

/** Auth and transactional mails only send via Resend in production — dev logs URLs instead. */
export function shouldSendMail(): boolean {
	return env.NODE_ENV === "production";
}
