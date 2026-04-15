import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import {
	topicPeriod,
	topicSearch,
	topicSort,
} from "@xamsa/schemas/modules/listings/topic";
import type {
	CreateTopicInputType,
	CreateTopicOutputType,
	ListTopicsInputType,
	ListTopicsOutputType,
} from "@xamsa/schemas/modules/topic";
import { definePagination } from "@xamsa/utils/pagination";
import { generateUniqueSlug } from "@xamsa/utils/slugify";

export async function createTopic(
	input: CreateTopicInputType,
	authorId: string,
): Promise<CreateTopicOutputType> {
	const pack = await prisma.pack.findUnique({
		where: {
			slug: input.pack,
			authorId,
			status: "draft", // topics can only be created in draft packs
		},
		select: {
			id: true,
			slug: true,
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: "Pack not found",
		});
	}

	const slug = await generateUniqueSlug(
		input.name,
		async (slug) =>
			!!(await prisma.topic.findUnique({
				where: {
					packId_slug: {
						packId: pack.id,
						slug,
					},
				},
			})),
	);

	return await prisma.$transaction(async (tx) => {
		const { order: lastOrder } = (await tx.topic.findFirst({
			where: {
				packId: pack.id,
			},
			orderBy: {
				order: "desc",
			},
			select: {
				order: true,
			},
		})) ?? { order: 0 };

		const topic = await tx.topic.create({
			data: {
				packId: pack.id,
				slug,
				name: input.name,
				order: lastOrder + 1,
			},
			select: {
				id: true,
				slug: true,
			},
		});

		if (input.questions.length !== 5) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Each topic must have exactly 5 questions",
			});
		}

		const questionsData = await Promise.all(
			input.questions.map(async (q, i) => ({
				topicId: topic.id,
				order: i + 1,
				...q,
				slug: await generateUniqueSlug(
					q.text,
					async (slug) =>
						!!(await tx.question.findUnique({
							where: {
								topicId_slug: {
									topicId: topic.id,
									slug,
								},
							},
						})),
				),
			})),
		);

		await tx.question.createMany({
			data: questionsData,
		});

		return { slug: topic.slug };
	});
}

export async function listTopics(
	input: ListTopicsInputType,
	userId?: string,
): Promise<ListTopicsOutputType> {
	const { page, limit, sort, dir, query, from, to, packs } = input;

	const p = definePagination(page, limit);
	const orderBy = topicSort.resolve(sort, dir);
	const searchWhere = topicSearch.resolve(query);
	const periodWhere = topicPeriod.resolve(from, to);

	const where: Prisma.TopicWhereInput = {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			{
				pack: packs ? { slug: { in: packs } } : undefined,
			},
			{
				pack: {
					AND: [
						{ OR: [{ status: "published" }, { authorId: userId }] },
						{
							OR: [
								{ visibility: "public" },
								{ visibility: "private", authorId: userId },
							],
						},
					],
				},
			},
		],
	};

	const [topics, total] = await prisma.$transaction([
		prisma.topic.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				slug: true,
				name: true,
				description: true,
				order: true,
			},
		}),
		prisma.topic.count({ where }),
	]);

	return p.output(topics, total);
}
