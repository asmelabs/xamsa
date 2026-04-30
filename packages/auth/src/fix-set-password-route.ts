import { BASE_ERROR_CODES, type BetterAuthPlugin } from "better-auth";
import {
	APIError,
	createAuthEndpoint,
	sensitiveSessionMiddleware,
} from "better-auth/api";
import * as z from "zod";

/**
 * Better Auth v1.5.5 binds `setPassword` without an HTTP path; the router
 * skips unnamed endpoints and POST `/set-password` never mounts.
 * Replacing via plugin restores the advertised route for OAuth-only users.
 */
export function fixSetPasswordRoute(): BetterAuthPlugin {
	return {
		id: "fix-set-password-route",
		endpoints: {
			setPassword: createAuthEndpoint(
				"/set-password",
				{
					method: "POST",
					body: z.object({
						newPassword: z
							.string()
							.meta({ description: "The new password to set is required" }),
					}),
					use: [sensitiveSessionMiddleware],
				},
				async (ctx) => {
					const { newPassword } = ctx.body;
					const session = ctx.context.session;
					const minPasswordLength =
						ctx.context.password.config.minPasswordLength;
					if (newPassword.length < minPasswordLength) {
						ctx.context.logger.error("Password is too short");
						throw APIError.from(
							"BAD_REQUEST",
							BASE_ERROR_CODES.PASSWORD_TOO_SHORT,
						);
					}
					const maxPasswordLength =
						ctx.context.password.config.maxPasswordLength;
					if (newPassword.length > maxPasswordLength) {
						ctx.context.logger.error("Password is too long");
						throw APIError.from(
							"BAD_REQUEST",
							BASE_ERROR_CODES.PASSWORD_TOO_LONG,
						);
					}
					const account = (
						await ctx.context.internalAdapter.findAccounts(session.user.id)
					).find((a) => a.providerId === "credential" && a.password);
					const passwordHash = await ctx.context.password.hash(newPassword);
					if (!account) {
						await ctx.context.internalAdapter.linkAccount({
							userId: session.user.id,
							providerId: "credential",
							accountId: session.user.id,
							password: passwordHash,
						});
						return ctx.json({ status: true });
					}
					throw APIError.from(
						"BAD_REQUEST",
						BASE_ERROR_CODES.PASSWORD_ALREADY_SET,
					);
				},
			),
		},
	};
}
