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
		CORS_ORIGIN: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
