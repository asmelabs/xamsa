import { dash } from "@better-auth/infra";
import { createPrismaClient } from "@xamsa/db";
import { env } from "@xamsa/env/server";
import {
	sendEmailChangeConfirmationEmail,
	sendEmailVerificationEmail,
	sendPasswordResetEmail,
} from "@xamsa/mail/auth";
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
import { fixSetPasswordRoute } from "./fix-set-password-route";
import {
	allocateUniqueOAuthUsername,
	ensureDisplayName,
	mirrorGoogleAvatarIfNeeded,
	needsAutoUsername,
} from "./oauth-google";

const trustedOrigins =
	env.NODE_ENV === "production"
		? ["https://xamsa.site", "https://www.xamsa.site"]
		: ["http://localhost:3000", "http://localhost:3001"];

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
				await sendPasswordResetEmail(user.email, user.name, url);
			},

			password: {
				hash: async (password) => await hash(password),
				verify: async (data) => await verify(data.password, data.hash),
			},
		},

		emailVerification: {
			sendOnSignUp: true,
			/** Issue session cookie after the user confirms via the emailed link (new signups never had a logged-in cookie). */
			autoSignInAfterVerification: true,

			async sendVerificationEmail({ url, user }) {
				// Better Auth does not surface send failures to the client; check @xamsa/mail logs.
				await sendEmailVerificationEmail(user.email, user.name, url);
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
				enabled: true,
				/** Existing unverified addresses can be corrected before verifying the new inbox. */
				updateEmailWithoutVerification: true,
				sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
					await sendEmailChangeConfirmationEmail({
						newEmail,
						name: user.name,
						url,
						previousEmail: user.email,
					});
				},
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

		account: {
			accountLinking: {
				enabled: true,
				trustedProviders: ["google"],
			},
		},

		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
				mapProfileToUser: (profile) => {
					const rawName =
						`${profile.given_name ?? ""} ${profile.family_name ?? ""}`.trim() ||
						(typeof profile.name === "string" ? profile.name : "");
					return {
						name: ensureDisplayName(rawName, profile.email),
						image: profile.picture ?? undefined,
					};
				},
			},
		},

		databaseHooks: {
			user: {
				create: {
					before: async (userRecord) => {
						const row = userRecord as Record<string, unknown>;
						const email = String(row.email ?? "");
						const name = ensureDisplayName(row.name, email);

						let username = row.username;
						if (needsAutoUsername(username)) {
							username = await allocateUniqueOAuthUsername(prisma, name, email);
						}

						return {
							data: {
								...row,
								name,
								username,
							},
						};
					},
					after: async (created) => {
						if (!created?.id || typeof created.username !== "string") return;
						await mirrorGoogleAvatarIfNeeded({
							prisma,
							userId: created.id,
							username: created.username,
							imageUrl: created.image,
						});
					},
				},
			},
		},

		plugins: [
			tanstackStartCookies(),
			dash(),
			twoFactor({
				issuer: "Xamsa",
			}),
			fixSetPasswordRoute(),
			haveIBeenPwned({
				paths: ["/auth/register", "/auth/reset-password", "/settings/security"],
			}),
			openAPI(),
			lastLoginMethod(),
		],
	});
}

export const auth = createAuth();
