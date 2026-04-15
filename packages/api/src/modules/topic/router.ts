import {
	CreateTopicInputSchema,
	CreateTopicOutputSchema,
	ListTopicsInputSchema,
	ListTopicsOutputSchema,
} from "@xamsa/schemas/modules/topic";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { createTopic, listTopics } from "./service";

export const topicRouter = {
	create: protectedProcedure
		.input(CreateTopicInputSchema)
		.output(CreateTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createTopic(input, context.session.user.id),
		),
	list: publicProcedure
		.input(ListTopicsInputSchema)
		.output(ListTopicsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await listTopics(input, context.session?.user.id),
		),
};
