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
}).extend({
	pack: PackSchema.shape.slug,
});

export const FindOneTopicOutputSchema = TopicSchema.pick({
	slug: true,
	name: true,
	order: true,
	description: true,
}).extend({
	isAuthor: z.boolean(),
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

/**
 * LIST
 */
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

/**
 * UPDATE
 */
export const UpdateTopicInputSchema = TopicSchema.pick({
	slug: true,
	name: true,
	description: true,
})
	.extend({
		pack: PackSchema.shape.slug,
	})
	.partial()
	.required({ slug: true, pack: true });

export const UpdateTopicOutputSchema = TopicSchema.pick({
	slug: true,
});

export type UpdateTopicInputType = z.infer<typeof UpdateTopicInputSchema>;
export type UpdateTopicOutputType = z.infer<typeof UpdateTopicOutputSchema>;

/**
 * REORDER
 */
export const UpdateTopicsOrderInputSchema = z.object({
	pack: PackSchema.shape.slug,
	topics: z
		.array(
			TopicSchema.pick({
				slug: true,
				order: true,
			}),
		)
		.min(1, "At least one topic is required"),
});

export const UpdateTopicsOrderOutputSchema = z.object({
	updated: z.number().int(),
});

export type UpdateTopicsOrderInputType = z.infer<
	typeof UpdateTopicsOrderInputSchema
>;
export type UpdateTopicsOrderOutputType = z.infer<
	typeof UpdateTopicsOrderOutputSchema
>;

/**
 * DELETE
 */
export const DeleteTopicInputSchema = TopicSchema.pick({
	slug: true,
	name: true,
}).extend({
	pack: PackSchema.shape.slug,
});

export const DeleteTopicOutputSchema = TopicSchema.pick({
	slug: true,
});

export type DeleteTopicInputType = z.infer<typeof DeleteTopicInputSchema>;
export type DeleteTopicOutputType = z.infer<typeof DeleteTopicOutputSchema>;
