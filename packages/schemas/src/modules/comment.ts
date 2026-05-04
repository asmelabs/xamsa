import z from "zod";
import { CursorPaginationInputSchema } from "../common/pagination";
import { CommentSchema, UserSchema } from "../db/schemas/models";
import { MentionUsernameSchema } from "./post";

const OptionalTargetSchema = z.object({
	packId: z.string().min(1).optional(),
	topicId: z.string().min(1).optional(),
	questionId: z.string().min(1).optional(),
	postId: z.string().min(1).optional(),
});

function targetCount(o: z.infer<typeof OptionalTargetSchema>) {
	return (
		(o.packId ? 1 : 0) +
		(o.topicId ? 1 : 0) +
		(o.questionId ? 1 : 0) +
		(o.postId ? 1 : 0)
	);
}

/** Public list scoped to one target entity. */
export const ListCommentsByTargetInputSchema = OptionalTargetSchema.extend(
	CursorPaginationInputSchema.shape,
).superRefine((data, ctx) => {
	const n = targetCount(data);
	if (n !== 1) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message:
				n === 0
					? "Provide exactly one of packId, topicId, questionId, postId."
					: "Only one of packId, topicId, questionId, postId may be set.",
			path: ["packId"],
		});
	}
});

export type ListCommentsByTargetInputType = z.infer<
	typeof ListCommentsByTargetInputSchema
>;

export const CreateCommentInputSchema = OptionalTargetSchema.extend({
	body: CommentSchema.shape.body,
	parentId: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
	if (data.parentId) {
		const n = targetCount(data);
		if (n > 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Replies may set at most one of packId, topicId, questionId, postId.",
				path: ["packId"],
			});
		}
		return;
	}
	const n = targetCount(data);
	if (n !== 1) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message:
				n === 0
					? "Provide exactly one of packId, topicId, questionId, postId."
					: "Only one of packId, topicId, questionId, postId may be set.",
			path: ["packId"],
		});
	}
});

export type CreateCommentInputType = z.infer<typeof CreateCommentInputSchema>;

export const DeleteCommentInputSchema = z.object({
	id: z.string().min(1),
});

export type DeleteCommentInputType = z.infer<typeof DeleteCommentInputSchema>;

export const CommentAuthorSchema = UserSchema.pick({
	id: true,
	username: true,
	name: true,
	image: true,
});

export const CommentRowSchema = CommentSchema.pick({
	id: true,
	createdAt: true,
	body: true,
	depth: true,
	parentId: true,
	rootId: true,
	packId: true,
	topicId: true,
	questionId: true,
	postId: true,
	totalReactions: true,
}).extend({
	user: CommentAuthorSchema,
	mentions: z.array(MentionUsernameSchema),
});

export type CommentRowType = z.infer<typeof CommentRowSchema>;

export type CommentThreadNodeType = CommentRowType & {
	replies: CommentThreadNodeType[];
};

export const CommentThreadNodeSchema: z.ZodType<CommentThreadNodeType> =
	CommentRowSchema.extend({
		replies: z.lazy(() => z.array(CommentThreadNodeSchema)),
	});

export const CreateCommentOutputSchema = CommentRowSchema;
export type CreateCommentOutputType = z.infer<typeof CreateCommentOutputSchema>;

export const DeleteCommentOutputSchema = z.object({
	ok: z.literal(true),
});
export type DeleteCommentOutputType = z.infer<typeof DeleteCommentOutputSchema>;

export const ListCommentsByTargetOutputSchema = z.object({
	items: z.array(CommentRowSchema),
	metadata: z.object({
		cursor: z.string().optional(),
		limit: z.number().int().min(1),
		nextCursor: z.string().min(1).nullable(),
		hasMore: z.boolean(),
	}),
});

export type ListCommentsByTargetOutputType = z.infer<
	typeof ListCommentsByTargetOutputSchema
>;

export const ListPostCommentThreadsInputSchema = z.object({
	postId: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(8),
	cursor: z.string().min(1).optional(),
});

export type ListPostCommentThreadsInputType = z.infer<
	typeof ListPostCommentThreadsInputSchema
>;

export const ListPostCommentThreadsOutputSchema = z.object({
	roots: z.array(CommentThreadNodeSchema),
	metadata: z.object({
		nextCursor: z.string().nullable(),
		hasMore: z.boolean(),
	}),
});

export type ListPostCommentThreadsOutputType = z.infer<
	typeof ListPostCommentThreadsOutputSchema
>;

export const ListPackCommentThreadsInputSchema = z.object({
	packId: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(8),
	cursor: z.string().min(1).optional(),
});

export type ListPackCommentThreadsInputType = z.infer<
	typeof ListPackCommentThreadsInputSchema
>;

export const ListTopicCommentThreadsInputSchema = z.object({
	topicId: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(8),
	cursor: z.string().min(1).optional(),
});

export type ListTopicCommentThreadsInputType = z.infer<
	typeof ListTopicCommentThreadsInputSchema
>;

export const ListPackCommentThreadsOutputSchema =
	ListPostCommentThreadsOutputSchema;
export const ListTopicCommentThreadsOutputSchema =
	ListPostCommentThreadsOutputSchema;

export type ListPackCommentThreadsOutputType = ListPostCommentThreadsOutputType;
export type ListTopicCommentThreadsOutputType =
	ListPostCommentThreadsOutputType;

export const ListQuestionCommentThreadsInputSchema = z.object({
	questionId: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(8),
	cursor: z.string().min(1).optional(),
});

export type ListQuestionCommentThreadsInputType = z.infer<
	typeof ListQuestionCommentThreadsInputSchema
>;

export const ListQuestionCommentThreadsOutputSchema =
	ListPostCommentThreadsOutputSchema;

export type ListQuestionCommentThreadsOutputType =
	ListPostCommentThreadsOutputType;
