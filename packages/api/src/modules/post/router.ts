import {
	CreatePostInputSchema,
	CreatePostOutputSchema,
	DeletePostInputSchema,
	DeletePostOutputSchema,
	ListPostsInputSchema,
	ListPostsOutputSchema,
} from "@xamsa/schemas/modules/post";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { createPost, deletePost, listPosts } from "./service";

export const postRouter = {
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
};
