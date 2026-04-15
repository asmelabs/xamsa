import z from "zod";
import {
	PackSchema,
	QuestionSchema,
	TopicSchema,
	UserSchema,
} from "../db/schemas/models";

export const CreateTopicInputSchema = TopicSchema.pick({
	name: true,
	description: true,
}).extend({
	pack: PackSchema.shape.slug,
	questions: z
		.array(
			QuestionSchema.pick({
				text: true,
				answer: true,
				acceptableAnswers: true,
				description: true,
				explanation: true,
			}),
		)
		.length(5, "Each topic must have 5 questions"),
});

export const CreateTopicOutputSchema = TopicSchema.pick({
	slug: true,
});

export type CreateTopicInputType = z.infer<typeof CreateTopicInputSchema>;
export type CreateTopicOutputType = z.infer<typeof CreateTopicOutputSchema>;

export const FindOneTopicInputSchema = TopicSchema.pick({
	slug: true,
});

export const FindOneTopicOutputSchema = TopicSchema.pick({
	slug: true,
	name: true,
	order: true,
	description: true,
}).extend({
	questions: z.array(
		QuestionSchema.pick({
			text: true,
			slug: true,
			order: true,
		}),
	),
	pack: PackSchema.pick({
		slug: true,
		name: true,
		status: true,
		visibility: true,
	}).extend({
		author: UserSchema.pick({
			name: true,
			username: true,
		}),
	}),
});

export type FindOneTopicInputType = z.infer<typeof FindOneTopicInputSchema>;
export type FindOneTopicOutputType = z.infer<typeof FindOneTopicOutputSchema>;
