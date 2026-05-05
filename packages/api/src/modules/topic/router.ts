import { TopicAnalyticsOutputSchema } from "@xamsa/schemas/modules/public-analytics";
import {
	BulkCreateTopicsInputSchema,
	BulkCreateTopicsOutputSchema,
	CreateTopicInputSchema,
	CreateTopicOutputSchema,
	DeleteTopicInputSchema,
	DeleteTopicOutputSchema,
	ExportTopicInputSchema,
	ExportTopicOutputSchema,
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
import {
	protectedProcedure,
	publicProcedure,
	verifiedProcedure,
} from "../../procedures";
import {
	generateTopicQuestionsWithAI,
	generateTopicWithAI,
	getAiTopicQuota,
} from "./ai.service";
import { getBulkCreateJob, startBulkCreateJob } from "./bulk-job.service";
import { exportTopic } from "./export";
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
	create: verifiedProcedure
		.input(CreateTopicInputSchema)
		.output(CreateTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createTopic(input, context.session.user.id),
		),
	bulkCreate: verifiedProcedure
		.input(BulkCreateTopicsInputSchema)
		.output(BulkCreateTopicsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await bulkCreateTopics(input, context.session.user.id),
		),
	startBulkCreateJob: verifiedProcedure
		.input(BulkCreateTopicsInputSchema)
		.output(StartBulkCreateJobOutputSchema)
		.handler(
			async ({ input, context }) =>
				await startBulkCreateJob(input, context.session.user.id),
		),
	getBulkCreateJob: verifiedProcedure
		.input(GetBulkCreateJobInputSchema)
		.output(GetBulkCreateJobOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getBulkCreateJob(input.jobId, context.session.user.id),
		),
	generateQuestions: verifiedProcedure
		.input(GenerateTopicQuestionsInputSchema)
		.output(GenerateTopicQuestionsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await generateTopicQuestionsWithAI(input, context.session.user.id),
		),
	generateTopic: verifiedProcedure
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
	previewStructuredImport: verifiedProcedure
		.input(PreviewStructuredImportInputSchema)
		.output(PreviewStructuredImportOutputSchema)
		.handler(({ input }) => previewStructuredImportFromBody(input)),
	previewStructuredImportFromUrl: verifiedProcedure
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
	update: verifiedProcedure
		.input(UpdateTopicInputSchema)
		.output(UpdateTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateTopic(input, context.session.user.id),
		),
	updateOrder: verifiedProcedure
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
	delete: verifiedProcedure
		.input(DeleteTopicInputSchema)
		.output(DeleteTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await deleteTopic(input, context.session.user.id),
		),
	export: verifiedProcedure
		.input(ExportTopicInputSchema)
		.output(ExportTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await exportTopic(input, context.session.user.id),
		),
};
