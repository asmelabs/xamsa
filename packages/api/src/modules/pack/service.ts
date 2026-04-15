import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import type {
	CreatePackInputType,
	CreatePackOutputType,
	FindOnePackInputType,
	FindOnePackOutputType,
	UpdatePackStatusInputType,
	UpdatePackStatusOutputType,
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

export async function updatePackStatus(
	input: UpdatePackStatusInputType,
	userId: string,
): Promise<UpdatePackStatusOutputType> {
	const pack = await prisma.pack.findUnique({
		where: {
			slug: input.slug,
			authorId: userId,
		},
		select: {
			id: true,
			status: true,
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: `Pack with slug ${input.slug} not found`,
		});
	}

	if (pack.status === input.status) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Pack is already in the desired status",
		});
	}

	const updatedPack = await prisma.pack.update({
		where: {
			id: pack.id,
			authorId: userId,
		},
		data: {
			status: input.status,
		},
		select: {
			slug: true,
		},
	});

	return updatedPack;
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
					OR: [{ status: "published" }, { authorId: userId }],
				},
			],
		},
		select: {
			_count: {
				select: {
					topics: true,
				},
			},
			authorId: true,
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

	const { authorId, status: packStatus, ...rest } = pack;

	const status = packStatus as Exclude<PackStatus, "deleted">;
	const isAuthor = authorId === userId;

	return {
		...rest,
		status,
		isAuthor,
	};
}
