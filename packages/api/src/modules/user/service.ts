import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	FindOneProfileInputType,
	FindOneProfileOutputType,
	UpdateProfileInputType,
	UpdateProfileOutputType,
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

export async function updateProfile(
	input: UpdateProfileInputType,
	userId: string,
): Promise<UpdateProfileOutputType> {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "You are not authorized to update this profile",
		});
	}

	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data: input,
		select: {
			username: true,
		},
	});

	return updatedUser;
}
