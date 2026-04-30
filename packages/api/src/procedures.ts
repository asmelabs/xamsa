import { ORPCError } from "@orpc/server";
import type { Role } from "@xamsa/schemas/db/schemas/enums/Role.schema";
import { ORPC_ERROR_EMAIL_NOT_VERIFIED } from "@xamsa/schemas/orpc/errors";
import { o } from "./o";

const withAuth = o.middleware(async ({ context, next }) => {
	const session = context.session;

	if (!session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}

	return next({
		context: {
			session,
		},
	});
});

const withVerifiedEmail = o.middleware(async ({ context, next }) => {
	const rawUser = context.session?.user;
	if (!rawUser) {
		throw new ORPCError("UNAUTHORIZED");
	}
	const user = rawUser as { emailVerified?: boolean };
	if (user.emailVerified !== true) {
		throw new ORPCError("FORBIDDEN", {
			message: "Verify your email to use this feature.",
			data: { code: ORPC_ERROR_EMAIL_NOT_VERIFIED },
		});
	}
	return next();
});

const withRoles = (...roles: Role[]) =>
	o.middleware(async ({ context, next }) => {
		const session = context.session;
		const userRole = session?.user?.role as Role | undefined;

		if (!session || !userRole || !roles.includes(userRole)) {
			throw new ORPCError("FORBIDDEN", {
				message: "You are not authorized to access this resource",
			});
		}

		return next({
			context: {
				session,
			},
		});
	});

export const publicProcedure = o;
export const protectedProcedure = publicProcedure.use(withAuth);
export const verifiedProcedure = protectedProcedure.use(withVerifiedEmail);
/** Moderation / dashboard — authenticated, email verified, eligible role */
export const moderatorProcedure = verifiedProcedure.use(
	withRoles("moderator", "admin"),
);
export const adminProcedure = verifiedProcedure.use(withRoles("admin"));
