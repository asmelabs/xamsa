import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import {
	packPeriod,
	packSearch,
	packSort,
} from "@xamsa/schemas/modules/listings/pack";
import type {
	CreatePackInputType,
	CreatePackOutputType,
	DeletePackInputType,
	DeletePackOutputType,
	FindOnePackInputType,
	FindOnePackOutputType,
	ListPacksInputType,
	ListPacksOutputType,
	UpdatePackStatusInputType,
	UpdatePackStatusOutputType,
} from "@xamsa/schemas/modules/pack";
import { defineCursorPagination } from "@xamsa/utils/pagination";
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
			ratings: {
				where: {
					userId,
				},
				select: {
					rating: true,
				},
				take: 1,
			},
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

	const { authorId, ratings, status: packStatus, ...rest } = pack;

	const status = packStatus as Exclude<PackStatus, "deleted">;
	const isAuthor = authorId === userId;
	const rating = ratings[0]?.rating;

	return {
		...rest,
		status,
		isAuthor,
		rating,
	};
}

export async function listPacks(
	input: ListPacksInputType,
	userId?: string,
): Promise<ListPacksOutputType> {
	const {
		cursor,
		limit,
		sort,
		dir,
		query,
		from,
		to,
		authors,
		visibilities,
		statuses,
		languages,
		minAverageRating,
		minPlays,
		hasRatings,
	} = input;

	const p = defineCursorPagination(cursor, limit);

	const orderBy = packSort.resolve(sort, dir);
	const searchWhere = packSearch.resolve(query);
	const periodWhere = packPeriod.resolve(from, to);

	const where: Prisma.PackWhereInput = {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			{
				authorId: authors ? { in: authors } : undefined,
				language: languages ? { in: languages } : undefined,
				visibility: visibilities ? { in: visibilities } : undefined,
				status: statuses ? { in: statuses } : undefined,
				totalPlays: minPlays ? { gte: minPlays } : undefined,
				averageRating: minAverageRating ? { gte: minAverageRating } : undefined,
				totalRatings: hasRatings ? { gte: 1 } : undefined,
			},
			{
				OR: [{ visibility: "public" }, { authorId: userId }],
			},
			{
				OR: [{ status: "published" }, { authorId: userId }],
			},
		],
	};

	const packs = await prisma.pack.findMany({
		where,
		orderBy,
		...p.use("slug"),
		select: {
			slug: true,
			name: true,
			description: true,
			averageRating: true,
			totalPlays: true,
			totalRatings: true,
			status: true,
			visibility: true,
			createdAt: true,
			language: true,
			_count: {
				select: {
					topics: true,
				},
			},
			author: {
				select: {
					name: true,
					username: true,
				},
			},
		},
	});

	return p.output(packs, (i) => i.slug);
}

export async function deletePack(
	input: DeletePackInputType,
	userId: string,
): Promise<DeletePackOutputType> {
	const pack = await prisma.pack.findUnique({
		where: {
			slug: input.slug,
			name: input.name, // for extra security
			authorId: userId,
		},
	});

	// TODO: after implementing games, prevent deleting packs with ongoing games

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: `Pack with slug ${input.slug} not found`,
		});
	}

	await prisma.pack.delete({
		where: {
			id: pack.id,
		},
	});

	return {
		slug: pack.slug,
	};
}
