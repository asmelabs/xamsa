import {
	CreatePostInputSchema,
	CreatePostOutputSchema,
	DeletePostInputSchema,
	DeletePostOutputSchema,
	FindOnePostInputSchema,
	GetPostInsightsInputSchema,
	GetPostInsightsOutputSchema,
	ListBookmarkedPostsInputSchema,
	ListPostsInputSchema,
	ListPostsOutputSchema,
	PostRowSchema,
	RecordPostViewInputSchema,
	RecordPostViewOutputSchema,
	SetPostBookmarkInputSchema,
	SetPostBookmarkOutputSchema,
} from "@xamsa/schemas/modules/post";
import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	createPost,
	deletePost,
	findOnePost,
	getPostInsights,
	listBookmarkedPosts,
	listPosts,
	recordPostView,
	setPostBookmark,
} from "./service";

export const postRouter = {
	findOne: publicProcedure
		.input(FindOnePostInputSchema)
		.output(PostRowSchema)
		.handler(({ input, context }) =>
			findOnePost(input, context.session?.user?.id),
		),
	list: publicProcedure
		.input(ListPostsInputSchema)
		.output(ListPostsOutputSchema)
		.handler(({ input, context }) =>
			listPosts(input, context.session?.user?.id),
		),
	create: protectedProcedure
		.input(CreatePostInputSchema)
		.output(CreatePostOutputSchema)
		.handler(({ input, context }) =>
			createPost(input, context.session.user.id),
		),
	delete: protectedProcedure
		.input(DeletePostInputSchema)
		.output(DeletePostOutputSchema)
		.handler(({ input, context }) =>
			deletePost(input, context.session.user.id),
		),
	setBookmark: protectedProcedure
		.input(SetPostBookmarkInputSchema)
		.output(SetPostBookmarkOutputSchema)
		.handler(({ input, context }) =>
			setPostBookmark(input, context.session.user.id),
		),
	listBookmarked: protectedProcedure
		.input(ListBookmarkedPostsInputSchema)
		.output(ListPostsOutputSchema)
		.handler(({ input, context }) =>
			listBookmarkedPosts(input, context.session.user.id),
		),
	recordView: publicProcedure
		.input(RecordPostViewInputSchema)
		.output(RecordPostViewOutputSchema)
		.handler(({ input }) => recordPostView(input)),
	getInsights: protectedProcedure
		.input(GetPostInsightsInputSchema)
		.output(GetPostInsightsOutputSchema)
		.handler(({ input, context }) =>
			getPostInsights(input, context.session.user.id),
		),
};
