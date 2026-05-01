import {
	CreateCommentInputSchema,
	CreateCommentOutputSchema,
	DeleteCommentInputSchema,
	DeleteCommentOutputSchema,
	ListCommentsByTargetInputSchema,
	ListCommentsByTargetOutputSchema,
} from "@xamsa/schemas/modules/comment";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { createComment, deleteComment, listCommentsByTarget } from "./service";

export const commentRouter = {
	create: protectedProcedure
		.input(CreateCommentInputSchema)
		.output(CreateCommentOutputSchema)
		.handler(async ({ input, context }) =>
			createComment(input, context.session.user.id),
		),
	delete: protectedProcedure
		.input(DeleteCommentInputSchema)
		.output(DeleteCommentOutputSchema)
		.handler(async ({ input, context }) =>
			deleteComment(input, context.session.user.id),
		),
	listByTarget: publicProcedure
		.input(ListCommentsByTargetInputSchema)
		.output(ListCommentsByTargetOutputSchema)
		.handler(async ({ input }) => listCommentsByTarget(input)),
};
