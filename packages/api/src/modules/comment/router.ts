import {
	CreateCommentInputSchema,
	CreateCommentOutputSchema,
	DeleteCommentInputSchema,
	DeleteCommentOutputSchema,
	ListCommentsByTargetInputSchema,
	ListCommentsByTargetOutputSchema,
	ListPackCommentThreadsInputSchema,
	ListPackCommentThreadsOutputSchema,
	ListPostCommentThreadsInputSchema,
	ListPostCommentThreadsOutputSchema,
	ListQuestionCommentThreadsInputSchema,
	ListQuestionCommentThreadsOutputSchema,
	ListTopicCommentThreadsInputSchema,
	ListTopicCommentThreadsOutputSchema,
} from "@xamsa/schemas/modules/comment";
import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	createComment,
	deleteComment,
	listCommentsByTarget,
	listPackCommentThreads,
	listPostCommentThreads,
	listQuestionCommentThreads,
	listTopicCommentThreads,
} from "./service";

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
	listThreadsByPost: publicProcedure
		.input(ListPostCommentThreadsInputSchema)
		.output(ListPostCommentThreadsOutputSchema)
		.handler(async ({ input }) => listPostCommentThreads(input)),
	listThreadsByPack: publicProcedure
		.input(ListPackCommentThreadsInputSchema)
		.output(ListPackCommentThreadsOutputSchema)
		.handler(async ({ input }) => listPackCommentThreads(input)),
	listThreadsByTopic: publicProcedure
		.input(ListTopicCommentThreadsInputSchema)
		.output(ListTopicCommentThreadsOutputSchema)
		.handler(async ({ input }) => listTopicCommentThreads(input)),
	listThreadsByQuestion: publicProcedure
		.input(ListQuestionCommentThreadsInputSchema)
		.output(ListQuestionCommentThreadsOutputSchema)
		.handler(async ({ input }) => listQuestionCommentThreads(input)),
};
