import { TopicAnalyticsOutputSchema } from "@xamsa/schemas/modules/public-analytics";
import {
	BulkCreateTopicsInputSchema,
	BulkCreateTopicsOutputSchema,
	CreateTopicInputSchema,
	CreateTopicOutputSchema,
	DeleteTopicInputSchema,
	DeleteTopicOutputSchema,
	FindOneTopicInputSchema,
	FindOneTopicOutputSchema,
	GenerateTopicInputSchema,
	GenerateTopicOutputSchema,
	GenerateTopicQuestionsInputSchema,
	GenerateTopicQuestionsOutputSchema,
	GetAiTopicQuotaOutputSchema,
	GetBulkCreateJobInputSchema,
	GetBulkCreateJobOutputSchema,
	ListTopicsInputSchema,
	ListTopicsOutputSchema,
	PreviewStructuredImportFromUrlInputSchema,
	PreviewStructuredImportInputSchema,
	PreviewStructuredImportOutputSchema,
	StartBulkCreateJobOutputSchema,
	UpdateTopicInputSchema,
	UpdateTopicOutputSchema,
	UpdateTopicsOrderInputSchema,
	UpdateTopicsOrderOutputSchema,
} from "@xamsa/schemas/modules/topic";
import z from "zod";
import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	generateTopicQuestionsWithAI,
	generateTopicWithAI,
	getAiTopicQuota,
} from "./ai.service";
import { getBulkCreateJob, startBulkCreateJob } from "./bulk-job.service";
import { previewStructuredImportFromRemoteUrl } from "./fetch-import-url";
import {
	bulkCreateTopics,
	createTopic,
	deleteTopic,
	findOneTopic,
	getTopicAnalytics,
	listTopics,
	updateTopic,
	updateTopicsOrder,
} from "./service";
import { previewStructuredImportFromBody } from "./structured-import";

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
	startBulkCreateJob: protectedProcedure
		.input(BulkCreateTopicsInputSchema)
		.output(StartBulkCreateJobOutputSchema)
		.handler(
			async ({ input, context }) =>
				await startBulkCreateJob(input, context.session.user.id),
		),
	getBulkCreateJob: protectedProcedure
		.input(GetBulkCreateJobInputSchema)
		.output(GetBulkCreateJobOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getBulkCreateJob(input.jobId, context.session.user.id),
		),
	generateQuestions: protectedProcedure
		.input(GenerateTopicQuestionsInputSchema)
		.output(GenerateTopicQuestionsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await generateTopicQuestionsWithAI(input, context.session.user.id),
		),
	generateTopic: protectedProcedure
		.input(GenerateTopicInputSchema)
		.output(GenerateTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await generateTopicWithAI(input, context.session.user.id),
		),
	getAiQuota: protectedProcedure
		.input(z.object({}))
		.output(GetAiTopicQuotaOutputSchema)
		.handler(async ({ context }) => getAiTopicQuota(context.session.user.id)),
	previewStructuredImport: protectedProcedure
		.input(PreviewStructuredImportInputSchema)
		.output(PreviewStructuredImportOutputSchema)
		.handler(({ input }) => previewStructuredImportFromBody(input)),
	previewStructuredImportFromUrl: protectedProcedure
		.input(PreviewStructuredImportFromUrlInputSchema)
		.output(PreviewStructuredImportOutputSchema)
		.handler(async ({ input }) => previewStructuredImportFromRemoteUrl(input)),
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
	getAnalytics: publicProcedure
		.input(FindOneTopicInputSchema)
		.output(TopicAnalyticsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getTopicAnalytics(input, context.session?.user.id),
		),
	delete: protectedProcedure
		.input(DeleteTopicInputSchema)
		.output(DeleteTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await deleteTopic(input, context.session.user.id),
		),
};
