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
 * — Larger batch: `BULK_TOPICS_MAX_TSUAL_IMPORT` (200) when importing from 3sual
 *   (`importedFromTsualPackageId`) or structured file/URL/paste (`importedViaStructuredImport`).
 */
export const BulkCreateTopicsInputSchema = z
	.object({
		pack: PackSchema.shape.slug,
		topics: z.array(CreateTopicPayloadSchema).min(1),
		/** 3sual `package.id` if topics came from a moderator import (records UserTsualPackageImport) */
		importedFromTsualPackageId: z.number().int().positive().optional(),
		/** True when topics were loaded via structured import preview (file, URL, or copy/paste). */
		importedViaStructuredImport: z.boolean().optional(),
	})
	.superRefine((data, ctx) => {
		const large =
			data.importedFromTsualPackageId != null ||
			data.importedViaStructuredImport === true;
		const cap = large ? BULK_TOPICS_MAX_TSUAL_IMPORT : BULK_TOPICS_MAX;
		if (data.topics.length > cap) {
			ctx.addIssue({
				code: z.ZodIssueCode.too_big,
				inclusive: true,
				maximum: cap,
				origin: "array",
				message: large
					? `Ən çoxu ${String(cap)} mövzu (import).`
					: `Ən çoxu ${String(cap)} mövzu bir dəfəyə (əl ilə).`,
				path: ["topics"],
			});
		}
	});

/** Max UTF-8 length for paste/file body sent to `previewStructuredImport`. */
export const STRUCTURED_IMPORT_RAW_MAX = 2_000_000 as const;

export const PreviewStructuredImportInputSchema = z.object({
	raw: z.string().max(STRUCTURED_IMPORT_RAW_MAX),
	/** Original filename e.g. `topics.csv` — guides format when content is ambiguous */
	filenameHint: z.string().max(260).optional(),
});

export const PreviewStructuredImportOutputSchema = z.object({
	topics: z.array(CreateTopicPayloadSchema).max(BULK_TOPICS_MAX_TSUAL_IMPORT),
});

export const PreviewStructuredImportFromUrlInputSchema = z.object({
	url: z
		.string()
		.url()
		.max(2048)
		.refine(
			(u) => {
				try {
					return new URL(u).protocol === "https:";
				} catch {
					return false;
				}
			},
			{ message: "Only HTTPS URLs are allowed" },
		),
});

export type PreviewStructuredImportInputType = z.infer<
	typeof PreviewStructuredImportInputSchema
>;
export type PreviewStructuredImportOutputType = z.infer<
	typeof PreviewStructuredImportOutputSchema
>;
export type PreviewStructuredImportFromUrlInputType = z.infer<
	typeof PreviewStructuredImportFromUrlInputSchema
>;

export const BulkCreateTopicsOutputSchema = z.object({
	created: z.array(TopicSchema.pick({ slug: true })),
});

export type BulkCreateTopicsInputType = z.infer<
	typeof BulkCreateTopicsInputSchema
>;
export type BulkCreateTopicsOutputType = z.infer<
	typeof BulkCreateTopicsOutputSchema
>;

export const StartBulkCreateJobOutputSchema = z.object({
	jobId: z.string().uuid(),
});

export const GetBulkCreateJobInputSchema = z.object({
	jobId: z.string().uuid(),
});

export const TopicBulkJobStatusSchema = z.enum([
	"pending",
	"running",
	"completed",
	"failed",
]);

export const GetBulkCreateJobOutputSchema = z.object({
	status: TopicBulkJobStatusSchema,
	totalTopics: z.number().int().min(0),
	errorMessage: z.string().nullable(),
	result: BulkCreateTopicsOutputSchema.nullable(),
	updatedAt: z.coerce.date(),
});

/**
 * EXPORT — pack/topic to file
 *
 * Mirrors the supported import formats. CSV/TXT use the same `;`-row "blocks"
 * layout the import parser already accepts; JSON / YAML / XML use the same
 * topic shape (`{ topics: [...] }`). Author/staff guarded server-side.
 */
export const ExportFormatSchema = z.enum(["json", "yaml", "xml", "csv", "txt"]);

export const ExportTopicInputSchema = z.object({
	packSlug: PackSchema.shape.slug,
	slug: TopicSchema.shape.slug,
	format: ExportFormatSchema,
});

export const ExportTopicOutputSchema = z.object({
	filename: z.string().min(1),
	mimeType: z.string().min(1),
	body: z.string(),
});

export type ExportFormatType = z.infer<typeof ExportFormatSchema>;
export type ExportTopicInputType = z.infer<typeof ExportTopicInputSchema>;
export type ExportTopicOutputType = z.infer<typeof ExportTopicOutputSchema>;

export type GetBulkCreateJobInputType = z.infer<
	typeof GetBulkCreateJobInputSchema
>;
export type GetBulkCreateJobOutputType = z.infer<
	typeof GetBulkCreateJobOutputSchema
>;

/**
 * AI: generate 5 questions for a topic (no DB write; server validates output).
 */
export const GenerateTopicQuestionsInputSchema = z.object({
	pack: PackSchema.shape.slug,
	topicName: z.string().min(1, "Topic name is required").max(100),
	topicDescription: z.string().max(1000).optional(),
	/** Optional; merged into the user prompt for this request only. */
	authorPrompt: z.string().max(2000).optional(),
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

/**
 * AI: generate a topic name + description for an existing pack (no DB write;
 * server validates output and never duplicates an existing topic name).
 */
export const GenerateTopicInputSchema = z.object({
	pack: PackSchema.shape.slug,
	/** Short hint to steer the seed, e.g. "phonetic constraint" or "Cuban history". */
	seed: z.string().max(200).optional(),
	/** Optional; merged into the user prompt for this request only. */
	authorPrompt: z.string().max(2000).optional(),
	/** If omitted, the pack’s language is used. */
	language: PackLanguageSchema.optional(),
});

export const GenerateTopicOutputSchema = TopicSchema.pick({
	name: true,
	description: true,
});

export type GenerateTopicInputType = z.infer<typeof GenerateTopicInputSchema>;
export type GenerateTopicOutputType = z.infer<typeof GenerateTopicOutputSchema>;

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
	id: true,
	slug: true,
	name: true,
	order: true,
	description: true,
	tdr: true,
}).extend({
	isAuthor: z.boolean(),
	/** True if any question in this topic has at least one scored QDR play. */
	hasRatedDifficulty: z.boolean(),
	questions: z.array(
		QuestionSchema.pick({
			text: true,
			slug: true,
			order: true,
			qdr: true,
			qdrScoredAttempts: true,
		}),
	),
	pack: PackSchema.pick({
		slug: true,
		name: true,
		status: true,
		visibility: true,
		pdr: true,
	}).extend({
		author: UserSchema.pick({
			name: true,
			username: true,
		}),
		/** True if any question in the pack has a scored QDR play. */
		hasRatedDifficulty: z.boolean(),
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

export const ListTopicsItemSchema = TopicSchema.pick({
	slug: true,
	name: true,
	description: true,
	order: true,
	tdr: true,
}).extend({
	_count: z.object({
		questions: z.int().min(0),
	}),
	hasRatedDifficulty: z.boolean(),
});

export const ListTopicsOutputSchema =
	PaginationOutputSchema(ListTopicsItemSchema);

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
