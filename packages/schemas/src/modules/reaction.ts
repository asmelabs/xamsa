import z from "zod";
import {
	CursorPaginationInputSchema,
	CursorPaginationOutputSchema,
} from "../common/pagination";
import { ReactionTypeSchema } from "../db/schemas/enums/ReactionType.schema";
import { UserSchema } from "../db/schemas/models";

/** Exactly one target; `type` null removes the user's reaction */
export const SetReactionInputSchema = z
	.object({
		postId: z.string().min(1).optional(),
		commentId: z.string().min(1).optional(),
		type: ReactionTypeSchema.nullable(),
	})
	.superRefine((data, ctx) => {
		const targets = (data.postId ? 1 : 0) + (data.commentId ? 1 : 0);
		if (targets !== 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Provide exactly one of postId or commentId.",
				path: ["postId"],
			});
		}
	});

export type SetReactionInputType = z.infer<typeof SetReactionInputSchema>;

export const SetReactionOutputSchema = z.object({
	ok: z.literal(true),
	type: ReactionTypeSchema.nullish(),
});

export type SetReactionOutputType = z.infer<typeof SetReactionOutputSchema>;

// --- listReactors ---

/**
 * Paginated list of users who reacted on a post or comment, optionally
 * filtered to a single reaction type. Powers the "who reacted" view inside
 * the reaction breakdown dialog.
 */
export const ListReactorsInputSchema = CursorPaginationInputSchema.extend({
	postId: z.string().min(1).optional(),
	commentId: z.string().min(1).optional(),
	type: ReactionTypeSchema.optional(),
}).superRefine((data, ctx) => {
	const targets = (data.postId ? 1 : 0) + (data.commentId ? 1 : 0);
	if (targets !== 1) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Provide exactly one of postId or commentId.",
			path: ["postId"],
		});
	}
});

export const ReactorRowSchema = z.object({
	id: z.string(),
	type: ReactionTypeSchema,
	createdAt: z.coerce.date(),
	user: UserSchema.pick({
		username: true,
		name: true,
		image: true,
	}),
});

export const ListReactorsOutputSchema =
	CursorPaginationOutputSchema(ReactorRowSchema);

export type ListReactorsInputType = z.infer<typeof ListReactorsInputSchema>;
export type ListReactorsOutputType = z.infer<typeof ListReactorsOutputSchema>;
export type ReactorRow = z.infer<typeof ReactorRowSchema>;
