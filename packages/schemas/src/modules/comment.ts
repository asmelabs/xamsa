import z from "zod";
import { CursorPaginationInputSchema } from "../common/pagination";
import { CommentSchema, UserSchema } from "../db/schemas/models";

const OptionalTargetTripleSchema = z.object({
	packId: z.string().min(1).optional(),
	topicId: z.string().min(1).optional(),
	questionId: z.string().min(1).optional(),
});

function targetCount(o: z.infer<typeof OptionalTargetTripleSchema>) {
	return (o.packId ? 1 : 0) + (o.topicId ? 1 : 0) + (o.questionId ? 1 : 0);
}

/** Public list scoped to one target entity. */
export const ListCommentsByTargetInputSchema =
	OptionalTargetTripleSchema.extend(
		CursorPaginationInputSchema.shape,
	).superRefine((data, ctx) => {
		const n = targetCount(data);
		if (n !== 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					n === 0
						? "Provide exactly one of packId, topicId, questionId."
						: "Only one of packId, topicId, questionId may be set.",
				path: ["packId"],
			});
		}
	});

export type ListCommentsByTargetInputType = z.infer<
	typeof ListCommentsByTargetInputSchema
>;

export const CreateCommentInputSchema = OptionalTargetTripleSchema.extend({
	body: CommentSchema.shape.body,
	parentId: z.string().min(1).optional(),
}).superRefine((data, ctx) => {
	if (data.parentId) {
		const n = targetCount(data);
		if (n > 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Replies may set at most one of packId, topicId, questionId.",
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
					? "Provide exactly one of packId, topicId, questionId."
					: "Only one of packId, topicId, questionId may be set.",
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
}).extend({
	user: CommentAuthorSchema,
});

export type CommentRowType = z.infer<typeof CommentRowSchema>;

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
