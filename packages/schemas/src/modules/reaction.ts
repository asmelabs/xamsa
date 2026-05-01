import z from "zod";
import { ReactionTypeSchema } from "../db/schemas/enums/ReactionType.schema";

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
