import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type { QuestionAnalyticsOutputType } from "@xamsa/schemas/modules/public-analytics";
import type {
	FindOneQuestionInputType,
	FindOneQuestionOutputType,
	ListTopicQuestionsInputType,
	ListTopicQuestionsOutputType,
	UpdateQuestionInputType,
	UpdateQuestionOutputType,
	UpdateQuestionsOrderInputType,
	UpdateQuestionsOrderOutputType,
} from "@xamsa/schemas/modules/question";
import { QUESTIONS_PER_TOPIC } from "@xamsa/utils/constants";
import { generateUniqueSlug } from "@xamsa/utils/slugify";
import { computeQuestionAnalytics } from "../analytics/public-stats";

export async function updateQuestion(
	input: UpdateQuestionInputType,
	userId: string,
): Promise<UpdateQuestionOutputType> {
	const { slug, pack: packSlug, topic: topicSlug, ...data } = input;

	const question = await prisma.question.findFirst({
		where: {
			slug,
			topic: {
				slug: topicSlug,
				pack: {
					slug: packSlug,
					status: "draft",
					authorId: userId,
				},
			},
		},
		select: {
			id: true,
			slug: true,
			text: true,
			topicId: true,
		},
	});

	if (!question) {
		throw new ORPCError("NOT_FOUND", {
			message: "Question not found or you don't have permission to edit it",
		});
	}

	let newSlug = question.slug;
	if (data.text && data.text !== question.text) {
		newSlug = await generateUniqueSlug(
			data.text,
			async (slug) =>
				!!(await prisma.question.findUnique({
					where: { topicId_slug: { topicId: question.topicId, slug } },
				})),
		);
	}

	const updatedQuestion = await prisma.question.update({
		where: { id: question.id },
		data: {
			...data,
			slug: newSlug,
		},
		select: {
			slug: true,
		},
	});

	return updatedQuestion;
}

export async function updateQuestionsOrder(
	input: UpdateQuestionsOrderInputType,
	userId: string,
): Promise<UpdateQuestionsOrderOutputType> {
	const { pack: packSlug, topic: topicSlug, questions } = input;

	if (questions.length !== QUESTIONS_PER_TOPIC) {
		throw new ORPCError("BAD_REQUEST", {
			message: `Exactly ${QUESTIONS_PER_TOPIC} questions are required`,
		});
	}

	const topic = await prisma.topic.findFirst({
		where: {
			slug: topicSlug,
			pack: {
				slug: packSlug,
				authorId: userId,
				status: "draft",
			},
		},
		select: {
			id: true,
		},
	});

	if (!topic) {
		throw new ORPCError("NOT_FOUND", {
			message: "Topic not found or you don't have permission to edit it",
		});
	}

	const orders = questions.map((q) => q.order);
	const uniqueOrders = new Set(orders);

	if (uniqueOrders.size !== orders.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Duplicate order values are not allowed",
		});
	}

	// Validate: orders must be exactly 1..QUESTIONS_PER_TOPIC
	for (let i = 1; i <= QUESTIONS_PER_TOPIC; i++) {
		if (!uniqueOrders.has(i)) {
			throw new ORPCError("BAD_REQUEST", {
				message: `Order values must be 1 through ${QUESTIONS_PER_TOPIC}`,
			});
		}
	}

	const existingQuestions = await prisma.question.findMany({
		where: {
			topicId: topic.id,
			slug: { in: questions.map((q) => q.slug) },
		},
		select: { slug: true },
	});

	if (existingQuestions.length !== questions.length) {
		throw new ORPCError("BAD_REQUEST", {
			message: "One or more questions do not belong to this topic",
		});
	}

	await prisma.$transaction([
		// First pass: negative temp values to avoid unique constraint conflicts
		...questions.map((question, i) =>
			prisma.question.update({
				where: {
					topicId_slug: { topicId: topic.id, slug: question.slug },
				},
				data: { order: -(i + 1) },
			}),
		),
		// Second pass: actual values
		...questions.map((question) =>
			prisma.question.update({
				where: {
					topicId_slug: { topicId: topic.id, slug: question.slug },
				},
				data: { order: question.order },
			}),
		),
	]);

	return { updated: questions.length };
}

export async function listTopicQuestions(
	input: ListTopicQuestionsInputType,
	userId: string,
): Promise<ListTopicQuestionsOutputType> {
	const { topic: topicSlug, pack: packSlug } = input;

	const questions = await prisma.question.findMany({
		select: {
			slug: true,
			acceptableAnswers: true,
			answer: true,
			description: true,
			explanation: true,
			order: true,
			text: true,
		},
		where: {
			topic: {
				slug: topicSlug,
				pack: {
					slug: packSlug,
					authorId: userId,
				},
			},
		},
	});

	return questions;
}

export async function findOneQuestion(
	input: FindOneQuestionInputType,
	userId: string,
): Promise<FindOneQuestionOutputType> {
	const question = await prisma.question.findFirst({
		select: {
			slug: true,
			acceptableAnswers: true,
			answer: true,
			description: true,
			explanation: true,
			order: true,
			text: true,
			qdr: true,
			qdrScoredAttempts: true,
			topic: {
				select: {
					id: true,
					slug: true,
					name: true,
					order: true,
					tdr: true,
					pack: {
						select: {
							id: true,
							slug: true,
							name: true,
							status: true,
							pdr: true,
							author: {
								select: {
									name: true,
									username: true,
								},
							},
						},
					},
				},
			},
		},
		where: {
			slug: input.question,
			topic: {
				slug: input.topic,
				pack: {
					slug: input.pack,
					authorId: userId,
				},
			},
		},
	});

	if (!question) {
		throw new ORPCError("NOT_FOUND", {
			message: "Question not found or you don't have permission to view it",
		});
	}

	const { topic, ...questionData } = question;
	const { pack, id: topicId, ...topicData } = topic;
	const { author, id: packId, ...packData } = pack;

	const hasRatedQuestionDifficulty = questionData.qdrScoredAttempts > 0;

	const [hasRatedTopicDifficulty, hasRatedPackDifficulty] = await Promise.all([
		prisma.question
			.count({
				where: { topicId, qdrScoredAttempts: { gt: 0 } },
			})
			.then((n) => n > 0),
		prisma.question
			.count({
				where: {
					topic: { packId },
					qdrScoredAttempts: { gt: 0 },
				},
			})
			.then((n) => n > 0),
	]);

	return {
		...questionData,
		topic: topicData,
		pack: packData,
		author,
		hasRatedQuestionDifficulty,
		hasRatedTopicDifficulty,
		hasRatedPackDifficulty,
	};
}

export async function getQuestionAnalytics(
	input: FindOneQuestionInputType,
	userId: string,
): Promise<QuestionAnalyticsOutputType> {
	const question = await prisma.question.findFirst({
		where: {
			slug: input.question,
			topic: {
				slug: input.topic,
				pack: {
					slug: input.pack,
					authorId: userId,
				},
			},
		},
		select: { id: true, order: true },
	});

	if (!question) {
		throw new ORPCError("NOT_FOUND", {
			message:
				"Question not found or you don't have permission to view analytics",
		});
	}

	return computeQuestionAnalytics(question.id, question.order);
}
