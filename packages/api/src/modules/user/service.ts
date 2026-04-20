import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	FindOneProfileInputType,
	FindOneProfileOutputType,
} from "@xamsa/schemas/modules/user";

export async function findOneProfile(
	input: FindOneProfileInputType,
): Promise<FindOneProfileOutputType> {
	const profile = await prisma.user.findUnique({
		where: {
			username: input.username,
		},
		select: {
			username: true,
			name: true,
			image: true,
			role: true,
		},
	});

	if (!profile) {
		throw new ORPCError("NOT_FOUND", {
			message: "Profile not found",
		});
	}

	return profile;
}
