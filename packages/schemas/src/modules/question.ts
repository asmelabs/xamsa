import z from "zod";
import {
	PackSchema,
	QuestionSchema,
	TopicSchema,
	UserSchema,
} from "../db/schemas/models";

export const UpdateQuestionInputSchema = QuestionSchema.pick({
	slug: true,
	answer: true,
	description: true,
	explanation: true,
	text: true,
})
	.extend({
		topic: TopicSchema.shape.slug,
		pack: PackSchema.shape.slug,
	})
	.partial()
	.required({ slug: true, topic: true, pack: true });

export const UpdateQuestionOutputSchema = QuestionSchema.pick({
	slug: true,
});

export type UpdateQuestionInputType = z.infer<typeof UpdateQuestionInputSchema>;
export type UpdateQuestionOutputType = z.infer<
	typeof UpdateQuestionOutputSchema
>;

/**
 * REORDER
 */
export const UpdateQuestionsOrderInputSchema = z.object({
	pack: PackSchema.shape.slug,
	topic: TopicSchema.shape.slug,

	questions: z
		.array(
			QuestionSchema.pick({
				slug: true,
				order: true,
			}),
		)
		.min(1, "At least one question is required"),
});

export const UpdateQuestionsOrderOutputSchema = z.object({
	updated: z.number().int(),
});

export type UpdateQuestionsOrderInputType = z.infer<
	typeof UpdateQuestionsOrderInputSchema
>;
export type UpdateQuestionsOrderOutputType = z.infer<
	typeof UpdateQuestionsOrderOutputSchema
>;

/**
 * LIST TOPIC QUESTIONS
 */
export const ListTopicQuestionsInputSchema = z.object({
	topic: TopicSchema.shape.slug,
	pack: PackSchema.shape.slug,
});

// since each topic has 5 questions, no need for pagination here
export const ListTopicQuestionsOutputSchema = z.array(
	QuestionSchema.pick({
		slug: true,
		acceptableAnswers: true,
		answer: true,
		description: true,
		explanation: true,
		order: true,
		text: true,
	}),
);

export type ListTopicQuestionsInputType = z.infer<
	typeof ListTopicQuestionsInputSchema
>;
export type ListTopicQuestionsOutputType = z.infer<
	typeof ListTopicQuestionsOutputSchema
>;

/**
 * FIND ONE
 */
export const FindOneQuestionInputSchema = z.object({
	pack: PackSchema.shape.slug,
	topic: TopicSchema.shape.slug,
	question: QuestionSchema.shape.slug,
});

export const FindOneQuestionOutputSchema = QuestionSchema.pick({
	id: true,
	slug: true,
	acceptableAnswers: true,
	answer: true,
	description: true,
	explanation: true,
	order: true,
	text: true,
	qdr: true,
	qdrScoredAttempts: true,
}).extend({
	topic: TopicSchema.pick({
		slug: true,
		name: true,
		order: true,
		tdr: true,
	}),
	pack: PackSchema.pick({
		slug: true,
		name: true,
		status: true,
		pdr: true,
	}),
	author: UserSchema.pick({
		name: true,
		username: true,
	}),
	/** At least one scored play on this question. */
	hasRatedQuestionDifficulty: z.boolean(),
	/** Any question in this topic has scored plays. */
	hasRatedTopicDifficulty: z.boolean(),
	/** Any question in this pack has scored plays. */
	hasRatedPackDifficulty: z.boolean(),
});

export type FindOneQuestionInputType = z.infer<
	typeof FindOneQuestionInputSchema
>;
export type FindOneQuestionOutputType = z.infer<
	typeof FindOneQuestionOutputSchema
>;
