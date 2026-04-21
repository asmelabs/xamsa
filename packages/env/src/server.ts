import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(1),
		ABLY_API_KEY: z.string().min(1),
		BETTER_AUTH_API_KEY: z.string().min(1),
		MAILERSEND_API_KEY: z.string().min(1),
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
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
