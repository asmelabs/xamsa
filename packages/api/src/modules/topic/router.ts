import {
	BulkCreateTopicsInputSchema,
	BulkCreateTopicsOutputSchema,
	CreateTopicInputSchema,
	CreateTopicOutputSchema,
	DeleteTopicInputSchema,
	DeleteTopicOutputSchema,
	FindOneTopicInputSchema,
	FindOneTopicOutputSchema,
	GenerateTopicQuestionsInputSchema,
	GenerateTopicQuestionsOutputSchema,
	GetAiTopicQuotaOutputSchema,
	ListTopicsInputSchema,
	ListTopicsOutputSchema,
	UpdateTopicInputSchema,
	UpdateTopicOutputSchema,
	UpdateTopicsOrderInputSchema,
	UpdateTopicsOrderOutputSchema,
} from "@xamsa/schemas/modules/topic";
import z from "zod";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { generateTopicQuestionsWithAI, getAiTopicQuota } from "./ai.service";
import {
	bulkCreateTopics,
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
	bulkCreate: protectedProcedure
		.input(BulkCreateTopicsInputSchema)
		.output(BulkCreateTopicsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await bulkCreateTopics(input, context.session.user.id),
		),
	generateQuestions: protectedProcedure
		.input(GenerateTopicQuestionsInputSchema)
		.output(GenerateTopicQuestionsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await generateTopicQuestionsWithAI(input, context.session.user.id),
		),
	getAiQuota: protectedProcedure
		.input(z.object({}))
		.output(GetAiTopicQuotaOutputSchema)
		.handler(async ({ context }) => getAiTopicQuota(context.session.user.id)),
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
