import { dash } from "@better-auth/infra";
import { createPrismaClient } from "@xamsa/db";
import { env } from "@xamsa/env/server";
import { sendEmailVerificationEmail, sendPasswordResetEmail } from "@xamsa/mail/auth";
import { hash, verify } from "@xamsa/utils/bcrypt";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
	haveIBeenPwned,
	lastLoginMethod,
	openAPI,
	twoFactor,
} from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

const trustedOrigins = env.NODE_ENV === "production" ? [
	"https://xamsa.site",
	"https://www.xamsa.site",
] : [
	"http://localhost:3000",
	"http://localhost:3001",
];

export function createAuth() {
	const prisma = createPrismaClient();

	return betterAuth({
		appName: "Xamsa",

		database: prismaAdapter(prisma, {
			provider: "postgresql",
		}),

		experimental: {
			joins: true,
		},

		trustedOrigins,
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			revokeSessionsOnPasswordReset: true,

			async sendResetPassword({ url, user }) {
				if (env.NODE_ENV === "production") {
					await sendPasswordResetEmail(user.email, user.name, url);
				} else {
					console.log("=== === === === ===");
					console.log("Sending reset password email to", user.email);
					console.log("URL:", url);
					console.log("=== === === === ===");
				}
			},

			password: {
				hash: async (password) => await hash(password),
				verify: async (data) => await verify(data.password, data.hash),
			},
		},

		emailVerification: {
			sendOnSignUp: true,

			async sendVerificationEmail({ url, user }) {
				if (env.NODE_ENV === "production") {
					await sendEmailVerificationEmail(user.email, user.name, url);
				} else {
					console.log("=== === === === ===");
					console.log("Sending verification email to", user.email);
					console.log("URL:", url);
					console.log("=== === === === ===");
				}
			},
		},

		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,

		advanced: {
			cookiePrefix: "xamsa",
			useSecureCookies: env.NODE_ENV !== "development",

			database: {
				generateId: "uuid",
			},
		},

		user: {
			deleteUser: {
				enabled: false,
			},
			changeEmail: {
				enabled: false,
			},
			additionalFields: {
				username: {
					type: "string",
					index: true,
					unique: true,
					returned: true,
					required: true,
					input: true,
				},

				role: {
					type: "string",
					returned: true,
					required: true,
					input: false,
					defaultValue: "user",
				},
			},
		},

		plugins: [
			tanstackStartCookies(),
			dash(),
			twoFactor({
				issuer: "Xamsa",
			}),
			haveIBeenPwned({
				paths: [
					"/auth/register",
					"/auth/reset-password",
					"/account/settings/security",
				],
			}),
			openAPI(),
			lastLoginMethod(),
		],
	});
}

export const auth = createAuth();
