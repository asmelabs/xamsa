import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server-side env. Values come from the host `process.env` (injected in production;
 * in local dev, `apps/web` loads `apps/web/.env` in `load-app-env.ts` before Vite
 * and API handlers start — see that file, not `createServerFn`, for file-based secrets).
 */
export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		DIRECT_URL: z.string().min(1),

		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(1),
		ABLY_API_KEY: z.string().min(1),
		BETTER_AUTH_API_KEY: z.string().min(1),
		RESEND_API_KEY: z.string().min(1),
		EMAIL_FROM: z.email(),
		// Comma-separated list of origins allowed to hit the auth/API. Single
		// value still works (e.g. `https://www.xamsa.site`); multiple values
		// are useful when the site is reachable from several hostnames, like
		// `https://xamsa.site,https://www.xamsa.site`.
		CORS_ORIGIN: z
			.string()
			.min(1)
			.transform((val) =>
				val
					.split(",")
					.map((o) => o.trim())
					.filter((o) => o.length > 0),
			)
			.pipe(z.array(z.url()).min(1)),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		/**
		 * When `"true"`, follower / game-winner notification emails still go through Resend in non-production.
		 * Production always sends (same as before). Auth emails are unchanged — see `shouldSendMail` in `@xamsa/mail`.
		 */
		SEND_NOTIFICATION_EMAIL_IN_DEV: z.enum(["true", "false"]).optional(),
		/** Optional. Used for server-side “Generate with AI” on topic questions (Google Gemini API / AI Studio). */
		GEMINI_API_KEY: z
			.string()
			.min(1)
			.transform((s) => s.trim())
			.optional(),

		CLOUDINARY_CLOUD_NAME: z.string().min(1),
		CLOUDINARY_API_KEY: z.string().min(1),
		CLOUDINARY_API_SECRET: z.string().min(1),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
