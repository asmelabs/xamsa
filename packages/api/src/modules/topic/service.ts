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
	DeleteTopicInputType,
	DeleteTopicOutputType,
	FindOneTopicInputType,
	FindOneTopicOutputType,
	ListTopicsInputType,
	ListTopicsOutputType,
	UpdateTopicInputType,
	UpdateTopicOutputType,
	UpdateTopicsOrderInputType,
	UpdateTopicsOrderOutputType,
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

export async function updateTopicsOrder(
	input: UpdateTopicsOrderInputType,
	userId: string,
): Promise<UpdateTopicsOrderOutputType> {
	const pack = await prisma.pack.findUnique({
		where: {
			slug: input.pack,
			authorId: userId,
			status: "draft",
		},
		select: {
			id: true,
			_count: { select: { topics: true } },
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: "Pack not found or you don't have permission to edit it",
		});
	}

	const orders = input.topics.map((t) => t.order);

	if (new Set(orders).size !== orders.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Duplicate order values are not allowed",
		});
	}

	const existingTopics = await prisma.topic.findMany({
		where: {
			packId: pack.id,
			slug: { in: input.topics.map((t) => t.slug) },
		},
		select: { slug: true },
	});

	if (existingTopics.length !== input.topics.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "One or more topics do not belong to this pack",
		});
	}

	await prisma.$transaction([
		// First pass: set all to negative temp values to avoid conflicts
		...input.topics.map((topic, i) =>
			prisma.topic.update({
				where: {
					packId_slug: { packId: pack.id, slug: topic.slug },
				},
				data: { order: -(i + 1) },
			}),
		),
		// Second pass: set actual values
		...input.topics.map((topic) =>
			prisma.topic.update({
				where: {
					packId_slug: { packId: pack.id, slug: topic.slug },
				},
				data: { order: topic.order },
			}),
		),
	]);

	return { updated: input.topics.length };
}

export async function findOneTopic(
	input: FindOneTopicInputType,
	userId?: string,
): Promise<FindOneTopicOutputType> {
	const topic = await prisma.topic.findFirst({
		where: {
			slug: input.slug,
			pack: {
				slug: input.pack,
				OR: [
					{ visibility: "public", status: "published" },
					{ authorId: userId ?? "" },
				],
			},
		},
		select: {
			slug: true,
			name: true,
			order: true,
			description: true,
			questions: {
				select: {
					text: true,
					slug: true,
					order: true,
				},
				orderBy: { order: "asc" },
			},
			pack: {
				select: {
					slug: true,
					name: true,
					status: true,
					visibility: true,
					authorId: true,
					author: {
						select: {
							name: true,
							username: true,
						},
					},
				},
			},
		},
	});

	if (!topic) {
		throw new ORPCError("NOT_FOUND", {
			message: `Topic with slug "${input.slug}" not found`,
		});
	}

	const isAuthor = !!userId && topic.pack.authorId === userId;

	const { authorId, ...pack } = topic.pack;

	return {
		...topic,
		isAuthor,
		pack,
		questions: isAuthor ? topic.questions : [],
	};
}

export async function updateTopic(
	input: UpdateTopicInputType,
	userId: string,
): Promise<UpdateTopicOutputType> {
	const { slug, pack: packSlug, ...data } = input;

	const pack = await prisma.pack.findUnique({
		where: {
			slug: packSlug,
			authorId: userId,
			status: "draft",
		},
		select: {
			id: true,
		},
	});

	if (!pack) {
		throw new ORPCError("NOT_FOUND", {
			message: "Pack not found or you don't have permission to edit it",
		});
	}

	const topic = await prisma.topic.findFirst({
		where: { slug, packId: pack.id },
		select: {
			id: true,
			name: true,
			slug: true,
		},
	});

	if (!topic) {
		throw new ORPCError("NOT_FOUND", {
			message: "Topic not found or you don't have permission to edit it",
		});
	}

	let newSlug = topic.slug;
	if (data.name && data.name !== topic.name) {
		newSlug = await generateUniqueSlug(
			data.name,
			async (slug) =>
				!!(await prisma.topic.findFirst({
					where: {
						packId: pack.id,
						slug,
					},
				})),
		);
	}

	const updatedTopic = await prisma.topic.update({
		where: { id: topic.id },
		data: {
			...data,
			slug: newSlug,
		},
		select: {
			slug: true,
		},
	});

	return updatedTopic;
}

export async function deleteTopic(
	input: DeleteTopicInputType,
	userId: string,
): Promise<DeleteTopicOutputType> {
	const topic = await prisma.topic.findFirst({
		select: {
			id: true,
			slug: true,
		},
		where: {
			slug: input.slug,
			name: input.name, // for extra security
			pack: {
				slug: input.pack,
				authorId: userId,
				status: "draft",
			},
		},
	});

	if (!topic) {
		throw new ORPCError("NOT_FOUND", {
			message: `Topic with slug ${input.slug} not found or you don't have permission to delete it`,
		});
	}

	await prisma.topic.delete({
		where: {
			id: topic.id,
		},
	});

	return {
		slug: topic.slug,
	};
}
