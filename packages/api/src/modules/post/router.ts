import {
	CreatePostInputSchema,
	CreatePostOutputSchema,
	DeletePostInputSchema,
	DeletePostOutputSchema,
	FindOnePostInputSchema,
	ListBookmarkedPostsInputSchema,
	ListPostsInputSchema,
	ListPostsOutputSchema,
	PostRowSchema,
	SetPostBookmarkInputSchema,
	SetPostBookmarkOutputSchema,
} from "@xamsa/schemas/modules/post";
import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	createPost,
	deletePost,
	findOnePost,
	listBookmarkedPosts,
	listPosts,
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
};
