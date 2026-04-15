import z from "zod";
import {
	PaginationInputSchema,
	PaginationOutputSchema,
} from "../common/pagination";
import {
	PackSchema,
	QuestionSchema,
	TopicSchema,
	UserSchema,
} from "../db/schemas/models";
import { topicPeriod, topicSearch, topicSort } from "./listings/topic";

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

export const ListTopicsFiltersSchema = z.object({
	packs: z.array(PackSchema.shape.slug),
});
export const ListTopicsInputSchema = ListTopicsFiltersSchema.partial()
	.extend(PaginationInputSchema.shape)
	.extend(topicSort.shape())
	.extend(topicSearch.shape())
	.extend(topicPeriod.shape());

export const ListTopicsOutputSchema = PaginationOutputSchema(
	TopicSchema.pick({
		slug: true,
		name: true,
		description: true,
		order: true,
	}),
);

export type ListTopicsFiltersType = z.infer<typeof ListTopicsFiltersSchema>;
export type ListTopicsInputType = z.infer<typeof ListTopicsInputSchema>;
export type ListTopicsOutputType = z.infer<typeof ListTopicsOutputSchema>;
