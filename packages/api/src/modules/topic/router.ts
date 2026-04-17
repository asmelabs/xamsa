import {
	CreateTopicInputSchema,
	CreateTopicOutputSchema,
	ListTopicsInputSchema,
	ListTopicsOutputSchema,
	UpdateTopicsOrderInputSchema,
	UpdateTopicsOrderOutputSchema,
} from "@xamsa/schemas/modules/topic";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { createTopic, listTopics, updateTopicsOrder } from "./service";

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
	updateOrder: protectedProcedure
		.input(UpdateTopicsOrderInputSchema)
		.output(UpdateTopicsOrderOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateTopicsOrder(input, context.session.user.id),
		),
};
