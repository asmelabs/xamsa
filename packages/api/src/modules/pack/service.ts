import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	CreatePackInputType,
	CreatePackOutputType,
	FindOnePackInputType,
	FindOnePackOutputType,
} from "@xamsa/schemas/modules/pack";
import { generateUniqueSlug } from "@xamsa/utils/slugify";
import { COMMON_PACK_SLUGS } from "./utils";

export async function createPack(
	input: CreatePackInputType,
	authorId: string,
): Promise<CreatePackOutputType> {
	const slug = await generateUniqueSlug(
		input.name,
		async (slug) =>
			!!(await prisma.pack.findUnique({
				where: { slug },
			})),
	);

	if (COMMON_PACK_SLUGS.includes(slug)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Name is too common. Please use a different name.",
		});
	}

	const pack = await prisma.pack.create({
		data: {
			authorId,
			slug,
			...input,
		},
		select: {
			slug: true,
		},
	});

	return pack;
}

export async function findOnePack(
	input: FindOnePackInputType,
	userId?: string,
): Promise<FindOnePackOutputType> {
	const pack = await prisma.pack.findUnique({
		where: {
			slug: input.slug,
			AND: [
				{
					OR: [
						{ visibility: "public" },
						{ visibility: "private", authorId: userId },
					],
				},
				{
					OR: [
						{ status: { in: ["published", "disabled"] } },
						{ status: { in: ["archived", "draft"] }, authorId: userId },
					],
				},
			],
		},
		select: {
			_count: {
				select: {
					topics: true,
				},
			},
			createdAt: true,
			name: true,
			slug: true,
			language: true,
			visibility: true,
			averageRating: true,
			description: true,
			status: true,
			totalPlays: true,
			totalRatings: true,
			author: {
				select: {
					name: true,
					username: true,
				},
			},
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: `Pack with slug ${input.slug} not found`,
		});
	}

	return pack as FindOnePackOutputType;
}
