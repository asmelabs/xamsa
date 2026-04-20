import {
	CreateTopicInputSchema,
	CreateTopicOutputSchema,
	DeleteTopicInputSchema,
	DeleteTopicOutputSchema,
	FindOneTopicInputSchema,
	FindOneTopicOutputSchema,
	ListTopicsInputSchema,
	ListTopicsOutputSchema,
	UpdateTopicInputSchema,
	UpdateTopicOutputSchema,
	UpdateTopicsOrderInputSchema,
	UpdateTopicsOrderOutputSchema,
} from "@xamsa/schemas/modules/topic";
import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	createTopic,
	deleteTopic,
	findOneTopic,
	listTopics,
	updateTopic,
	updateTopicsOrder,
} from "./service";

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
	update: protectedProcedure
		.input(UpdateTopicInputSchema)
		.output(UpdateTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateTopic(input, context.session.user.id),
		),
	updateOrder: protectedProcedure
		.input(UpdateTopicsOrderInputSchema)
		.output(UpdateTopicsOrderOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateTopicsOrder(input, context.session.user.id),
		),
	findOne: publicProcedure
		.input(FindOneTopicInputSchema)
		.output(FindOneTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await findOneTopic(input, context.session?.user.id),
		),
	delete: protectedProcedure
		.input(DeleteTopicInputSchema)
		.output(DeleteTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await deleteTopic(input, context.session.user.id),
		),
};
