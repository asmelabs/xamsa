import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	UpdateUserRoleInputType,
	UpdateUserRoleOutputType,
} from "@xamsa/schemas/modules/admin";

/**
 * Admin-only mutation. Updates the target user's role and revokes every active
 * Better Auth session for that user so the new permissions take effect on the
 * next request. Targeting another `admin` or yourself is forbidden.
 */
export async function updateUserRole(
	input: UpdateUserRoleInputType,
	actorUserId: string,
): Promise<UpdateUserRoleOutputType> {
	if (input.userId === actorUserId) {
		throw new ORPCError("FORBIDDEN", {
			message: "You cannot change your own role.",
		});
	}

	const target = await prisma.user.findUnique({
		where: { id: input.userId },
		select: { id: true, role: true },
	});

	if (!target) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
		});
	}

	if (target.role === "admin") {
		throw new ORPCError("FORBIDDEN", {
			message: "Admin roles can only be changed manually in the database.",
		});
	}

	if (target.role === input.role) {
		throw new ORPCError("BAD_REQUEST", {
			message: "User is already in this role.",
		});
	}

	const result = await prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: target.id },
			data: { role: input.role },
		});
		const revoked = await tx.session.deleteMany({
			where: { userId: target.id },
		});
		return { sessionsRevoked: revoked.count };
	});

	return {
		userId: target.id,
		role: input.role,
		sessionsRevoked: result.sessionsRevoked,
	};
}
