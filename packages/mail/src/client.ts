import { env } from "@xamsa/env/server";
import { Resend } from "resend";

/** Resend `from` must be a verified domain in production. */
export const mailFrom = `Xamsa <${env.EMAIL_FROM}>`;

export const resend = new Resend(env.RESEND_API_KEY);
