import { env } from "@xamsa/env/server";

/** Auth and transactional mails only send via MailerSend in production — dev logs URLs instead. */
export function shouldSendMail(): boolean {
	return env.NODE_ENV === "production";
}
