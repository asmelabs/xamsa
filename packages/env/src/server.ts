import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const corsOriginSchema = z
	.string()
	.min(1)
	.transform((val) =>
		val
			.split(",")
			.map((o) => o.trim())
			.filter((o) => o.length > 0),
	)
	.pipe(z.array(z.url()).min(1));

export const env = createEnv({
	server: {
		/** AUTH */
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(1),
		BETTER_AUTH_API_KEY: z.string().min(1),
		CORS_ORIGIN: corsOriginSchema,

		/** DATABASE */
		DATABASE_URL: z.string().min(1),
		DIRECT_URL: z.string().min(1),

		/** MAIL */
		RESEND_API_KEY: z.string().min(1),
		EMAIL_FROM: z.email(),
		SEND_NOTIFICATION_EMAIL_IN_DEV: z.enum(["true", "false"]).optional(),

		/** ABLY */
		ABLY_API_KEY: z.string().min(1),

		/** LLM */
		GEMINI_API_KEY: z
			.string()
			.min(1)
			.transform((s) => s.trim())
			.optional(),

		/** CLOUDINARY */
		CLOUDINARY_CLOUD_NAME: z.string().min(1),
		CLOUDINARY_API_KEY: z.string().min(1),
		CLOUDINARY_API_SECRET: z.string().min(1),

		/** GOOGLE */
		GOOGLE_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),

		/** APP CONFIG */
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
