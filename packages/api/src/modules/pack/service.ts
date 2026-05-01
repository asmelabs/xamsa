import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type { GetPaginatedItem } from "@xamsa/schemas/common/pagination";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import {
	packPeriod,
	packSearch,
	packSort,
} from "@xamsa/schemas/modules/listings/pack";
import type {
	BulkCreatePacksInputType,
	BulkCreatePacksOutputType,
	CreatePackInputType,
	CreatePackOutputType,
	DeletePackInputType,
	DeletePackOutputType,
	FindOnePackInputType,
	FindOnePackOutputType,
	ListPacksInputType,
	ListPacksOutputType,
	UpdatePackInputType,
	UpdatePackOutputType,
	UpdatePackStatusInputType,
	UpdatePackStatusOutputType,
} from "@xamsa/schemas/modules/pack";
import type { PackAnalyticsOutputType } from "@xamsa/schemas/modules/public-analytics";
import { defineCursorPagination } from "@xamsa/utils/pagination";
import { computeLevelFromXp } from "@xamsa/utils/progression";
import { generateUniqueSlug } from "@xamsa/utils/slugify";
import { assertNonReservedContentSlug } from "../../lib/content-slug";
import { computePackAnalytics } from "../analytics/public-stats";

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

	assertNonReservedContentSlug(slug);
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

export async function bulkCreatePacks(
	input: BulkCreatePacksInputType,
	authorId: string,
): Promise<BulkCreatePacksOutputType> {
	return await prisma.$transaction(async (tx) => {
		const created: { slug: string }[] = [];

		for (const packIn of input.packs) {
			const slug = await generateUniqueSlug(
				packIn.name,
				async (candidate) =>
					!!(await tx.pack.findUnique({
						where: { slug: candidate },
					})),
			);

			assertNonReservedContentSlug(slug);
			const p = await tx.pack.create({
				data: {
					authorId,
					slug,
					...packIn,
				},
				select: { slug: true },
			});
			created.push(p);
		}

		return { created };
	});
}

export async function updatePack(
	input: UpdatePackInputType,
	userId: string,
): Promise<UpdatePackOutputType> {
	const { slug, ...data } = input;

	const pack = await prisma.pack.findUnique({
		where: {
			slug,
			authorId: userId,
		},
		select: {
			id: true,
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: `Pack with slug ${input.slug} not found`,
		});
	}

	const updatedPack = await prisma.pack.update({
		where: { id: pack.id },
		data,
		select: {
			slug: true,
		},
	});

	return updatedPack;
}

export async function updatePackStatus(
	input: UpdatePackStatusInputType,
	userId: string,
): Promise<UpdatePackStatusOutputType> {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			xp: true,
		},
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
		});
	}

	const pack = await prisma.pack.findUnique({
		where: {
			slug: input.slug,
			authorId: userId,
		},
		select: {
			id: true,
			status: true,
			publishedAt: true,
			_count: {
				select: {
					topics: true,
				},
			},
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

	const isInitialPublish = input.status === "published" && !pack.publishedAt;
	const newPublishedAt = isInitialPublish ? new Date() : undefined;
	const newXp = isInitialPublish ? user.xp + pack._count.topics * 100 : user.xp;

	const updatedPack = await prisma.pack.update({
		where: {
			id: pack.id,
			authorId: userId,
		},
		data: {
			status: input.status,
			publishedAt: newPublishedAt,
			author: {
				update: {
					xp: newXp,
					level: computeLevelFromXp(newXp),
					totalPacksPublished: isInitialPublish
						? {
								increment: 1,
							}
						: undefined,
				},
			},
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
			id: true,
			_count: {
				select: {
					topics: true,
				},
			},
			authorId: true,
			publishedAt: true,
			name: true,
			slug: true,
			language: true,
			visibility: true,
			averageRating: true,
			description: true,
			status: true,
			pdr: true,
			totalPlays: true,
			totalRatings: true,
			allowOthersHost: true,
			showTopicsInfo: true,
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

	const { authorId, ratings, id: packId, status: packStatus, ...rest } = pack;

	const hasRatedDifficulty =
		(await prisma.question.count({
			where: {
				topic: { packId },
				qdrScoredAttempts: { gt: 0 },
			},
		})) > 0;

	const status = packStatus as Exclude<PackStatus, "deleted">;
	const isAuthor = authorId === userId;
	const rating = ratings[0]?.rating;

	return {
		...rest,
		status,
		isAuthor,
		rating,
		hasRatedDifficulty,
	};
}

export async function getPackAnalytics(
	slug: string,
	userId?: string,
): Promise<PackAnalyticsOutputType> {
	const pack = await prisma.pack.findFirst({
		where: {
			slug,
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
		select: { id: true, totalPlays: true },
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: `Pack with slug ${slug} not found`,
		});
	}

	return computePackAnalytics(pack.id, pack.totalPlays);
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
		onlyMyPacks,
		canHost,
	} = input;

	const p = defineCursorPagination(cursor, limit);

	if (canHost === true && !userId) {
		return p.output(
			[] as GetPaginatedItem<ListPacksOutputType>[],
			(i) => i.slug,
		);
	}

	const orderBy = packSort.resolve(sort, dir);
	const searchWhere = packSearch.resolve(query);
	const periodWhere = packPeriod.resolve(from, to);

	const canHostWhere: Prisma.PackWhereInput | undefined =
		canHost === true && userId
			? {
					status: "published",
					OR: [
						{ authorId: userId },
						{ allowOthersHost: true, visibility: "public" },
					],
				}
			: undefined;

	const where: Prisma.PackWhereInput = {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(canHostWhere ? [canHostWhere] : []),
			{
				...(onlyMyPacks === true && userId
					? { authorId: userId }
					: authors?.length
						? { author: { username: { in: authors } } }
						: {}),
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
			id: true,
			slug: true,
			name: true,
			description: true,
			averageRating: true,
			totalPlays: true,
			totalRatings: true,
			pdr: true,
			status: true,
			visibility: true,
			publishedAt: true,
			language: true,
			allowOthersHost: true,
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

	const packIds = packs.map((x) => x.id);
	const ratedRows =
		packIds.length === 0
			? []
			: await prisma.topic.findMany({
					where: {
						packId: { in: packIds },
						questions: { some: { qdrScoredAttempts: { gt: 0 } } },
					},
					select: { packId: true },
					distinct: ["packId"],
				});
	const ratedPackIds = new Set(ratedRows.map((r) => r.packId));

	const withDifficulty = packs.map(({ id, ...row }) => ({
		...row,
		hasRatedDifficulty: ratedPackIds.has(id),
	}));

	return p.output(withDifficulty, (i) => i.slug);
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
		select: {
			id: true,
			slug: true,
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: `Pack with slug ${input.slug} not found`,
		});
	}

	const activeGame = await prisma.game.findFirst({
		where: {
			packId: pack.id,
			status: { not: "completed" },
		},
	});

	if (activeGame) {
		throw new ORPCError("BAD_REQUEST", {
			message:
				"Pack has ongoing games. You cannot delete it until all games are completed.",
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
