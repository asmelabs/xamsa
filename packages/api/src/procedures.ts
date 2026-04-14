import { ORPCError } from "@orpc/server";
import type { Role } from "@xamsa/schemas/db/schemas/enums/Role.schema";
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
export const moderatorProcedure = protectedProcedure.use(
	withRoles("moderator", "admin"),
);
export const adminProcedure = protectedProcedure.use(withRoles("admin"));
