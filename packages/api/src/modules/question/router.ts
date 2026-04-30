import { QuestionAnalyticsOutputSchema } from "@xamsa/schemas/modules/public-analytics";
import {
	FindOneQuestionInputSchema,
	FindOneQuestionOutputSchema,
	ListTopicQuestionsInputSchema,
	ListTopicQuestionsOutputSchema,
	UpdateQuestionInputSchema,
	UpdateQuestionOutputSchema,
	UpdateQuestionsOrderInputSchema,
	UpdateQuestionsOrderOutputSchema,
} from "@xamsa/schemas/modules/question";
import { verifiedProcedure } from "../../procedures";
import {
	findOneQuestion,
	getQuestionAnalytics,
	listTopicQuestions,
	updateQuestion,
	updateQuestionsOrder,
} from "./service";

export const questionRouter = {
	update: verifiedProcedure
		.input(UpdateQuestionInputSchema)
		.output(UpdateQuestionOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateQuestion(input, context.session.user.id),
		),
	updateOrder: verifiedProcedure
		.input(UpdateQuestionsOrderInputSchema)
		.output(UpdateQuestionsOrderOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateQuestionsOrder(input, context.session.user.id),
		),
	listTopicQuestions: verifiedProcedure
		.input(ListTopicQuestionsInputSchema)
		.output(ListTopicQuestionsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await listTopicQuestions(input, context.session.user.id),
		),
	findOne: verifiedProcedure
		.input(FindOneQuestionInputSchema)
		.output(FindOneQuestionOutputSchema)
		.handler(
			async ({ input, context }) =>
				await findOneQuestion(input, context.session.user.id),
		),
	getAnalytics: verifiedProcedure
		.input(FindOneQuestionInputSchema)
		.output(QuestionAnalyticsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getQuestionAnalytics(input, context.session.user.id),
		),
};
