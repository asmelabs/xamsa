import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	CreatePackRatingInputType,
	CreatePackRatingOutputType,
} from "@xamsa/schemas/modules/pack-rating";

export async function createPackRating(
	input: CreatePackRatingInputType,
	userId: string,
): Promise<CreatePackRatingOutputType> {
	// author cannot rate their own pack

	const pack = await prisma.pack.findUnique({
		where: {
			slug: input.pack,
			authorId: { not: userId },
			status: "published", // only published packs can be rated
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: `Pack with slug ${input.pack} not found to rate`,
		});
	}

	const existingRating = await prisma.packRating.findUnique({
		where: {
			userId_packId: {
				userId,
				packId: pack.id,
			},
		},
	});

	if (existingRating) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You have already rated this pack",
		});
	}

	await prisma.$transaction(async (tx) => {
		await tx.packRating.create({
			data: {
				userId,
				packId: pack.id,
				rating: input.rating,
			},
		});

		const newTotal = pack.totalRatings + 1;
		const newAverage =
			(pack.averageRating * pack.totalRatings + input.rating) / newTotal;

		await tx.pack.update({
			where: { id: pack.id },
			data: {
				totalRatings: newTotal,
				averageRating: Math.round(newAverage * 100) / 100,
			},
		});
	});

	return {
		rating: input.rating,
		pack: input.pack,
	};
}
