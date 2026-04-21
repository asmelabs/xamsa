import { env } from "@xamsa/env/server";
import {
  MailerSend,
  Sender,
} from "mailersend"

export const sentFrom = new Sender(
  env.EMAIL_FROM,
  "Xamsa"
)

export const mailer = new MailerSend({
  apiKey: env.MAILERSEND_API_KEY,
})
