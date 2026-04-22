import z from "zod";
import { BULK_TOPICS_MAX, BULK_TOPICS_MAX_TSUAL_IMPORT } from "../common/bulk";
import {
	PaginationInputSchema,
	PaginationOutputSchema,
} from "../common/pagination";
import { PackLanguageSchema } from "../db/schemas/enums/PackLanguage.schema";
import {
	PackSchema,
	QuestionSchema,
	TopicSchema,
	UserSchema,
} from "../db/schemas/models";
import { topicPeriod, topicSearch, topicSort } from "./listings/topic";

const createTopicQuestionRowSchema = QuestionSchema.pick({
	text: true,
	answer: true,
	acceptableAnswers: true,
	description: true,
	explanation: true,
});

const createTopicQuestionsArraySchema = z
	.array(createTopicQuestionRowSchema)
	.length(5, "Each topic must have 5 questions");

/** One topic (name + 5 questions) without pack; used by create, bulk, and AI output. */
export const CreateTopicPayloadSchema = TopicSchema.pick({
	name: true,
	description: true,
}).extend({
	questions: createTopicQuestionsArraySchema,
});

export const CreateTopicInputSchema = CreateTopicPayloadSchema.extend({
	pack: PackSchema.shape.slug,
});

export const CreateTopicOutputSchema = TopicSchema.pick({
	slug: true,
});

export type CreateTopicInputType = z.infer<typeof CreateTopicInputSchema>;
export type CreateTopicOutputType = z.infer<typeof CreateTopicOutputSchema>;
export type CreateTopicPayloadType = z.infer<typeof CreateTopicPayloadSchema>;

/**
 * BULK CREATE (single pack, many topics)
 * — Default max: `BULK_TOPICS_MAX` (20).
 * — With `importedFromTsualPackageId` (3sual import): `BULK_TOPICS_MAX_TSUAL_IMPORT` (200).
 */
export const BulkCreateTopicsInputSchema = z
	.object({
		pack: PackSchema.shape.slug,
		topics: z.array(CreateTopicPayloadSchema).min(1),
		/** 3sual `package.id` if topics came from a moderator import (records UserTsualPackageImport) */
		importedFromTsualPackageId: z.number().int().positive().optional(),
	})
	.superRefine((data, ctx) => {
		const cap =
			data.importedFromTsualPackageId != null
				? BULK_TOPICS_MAX_TSUAL_IMPORT
				: BULK_TOPICS_MAX;
		if (data.topics.length > cap) {
			ctx.addIssue({
				code: z.ZodIssueCode.too_big,
				inclusive: true,
				maximum: cap,
				origin: "array",
				message:
					data.importedFromTsualPackageId != null
						? `Ən çoxu ${String(cap)} mövzu (3sual import).`
						: `Ən çoxu ${String(cap)} mövzu bir dəfəyə (əl ilə).`,
				path: ["topics"],
			});
		}
	});

export const BulkCreateTopicsOutputSchema = z.object({
	created: z.array(TopicSchema.pick({ slug: true })),
});

export type BulkCreateTopicsInputType = z.infer<
	typeof BulkCreateTopicsInputSchema
>;
export type BulkCreateTopicsOutputType = z.infer<
	typeof BulkCreateTopicsOutputSchema
>;

/**
 * AI: generate 5 questions for a topic (no DB write; server validates output).
 */
export const GenerateTopicQuestionsInputSchema = z.object({
	pack: PackSchema.shape.slug,
	topicName: z.string().min(1, "Topic name is required").max(100),
	topicDescription: z.string().max(1000).optional(),
	/** If omitted, the pack’s language is used. */
	language: PackLanguageSchema.optional(),
});

export const GenerateTopicQuestionsOutputSchema = z.object({
	questions: createTopicQuestionsArraySchema,
});

export type GenerateTopicQuestionsInputType = z.infer<
	typeof GenerateTopicQuestionsInputSchema
>;
export type GenerateTopicQuestionsOutputType = z.infer<
	typeof GenerateTopicQuestionsOutputSchema
>;

export const GetAiTopicQuotaOutputSchema = z.object({
	used: z.number().int().min(0),
	limit: z.number().int().min(0),
	resetsAt: z.string(),
});

export type GetAiTopicQuotaOutputType = z.infer<
	typeof GetAiTopicQuotaOutputSchema
>;

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
