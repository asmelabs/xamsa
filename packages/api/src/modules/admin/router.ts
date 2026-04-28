import {
	ListAdminBadgesInputSchema,
	ListAdminBadgesOutputSchema,
	ListAdminClicksInputSchema,
	ListAdminClicksOutputSchema,
	ListAdminGamesInputSchema,
	ListAdminGamesOutputSchema,
	ListAdminPacksInputSchema,
	ListAdminPacksOutputSchema,
	ListAdminQuestionsInputSchema,
	ListAdminQuestionsOutputSchema,
	ListAdminTopicBulkJobsInputSchema,
	ListAdminTopicBulkJobsOutputSchema,
	ListAdminTopicsInputSchema,
	ListAdminTopicsOutputSchema,
	ListAdminUsersInputSchema,
	ListAdminUsersOutputSchema,
} from "@xamsa/schemas/modules/admin";
import { moderatorProcedure } from "../../procedures";
import {
	listAdminBadges,
	listAdminClicks,
	listAdminGames,
	listAdminPacks,
	listAdminQuestions,
	listAdminTopicBulkJobs,
	listAdminTopics,
	listAdminUsers,
} from "./service";

export const adminRouter = {
	listBadges: moderatorProcedure
		.input(ListAdminBadgesInputSchema)
		.output(ListAdminBadgesOutputSchema)
		.handler(async ({ input }) => await listAdminBadges(input)),
	listPacks: moderatorProcedure
		.input(ListAdminPacksInputSchema)
		.output(ListAdminPacksOutputSchema)
		.handler(async ({ input }) => await listAdminPacks(input)),
	listUsers: moderatorProcedure
		.input(ListAdminUsersInputSchema)
		.output(ListAdminUsersOutputSchema)
		.handler(async ({ input }) => await listAdminUsers(input)),
	listGames: moderatorProcedure
		.input(ListAdminGamesInputSchema)
		.output(ListAdminGamesOutputSchema)
		.handler(async ({ input }) => await listAdminGames(input)),
	listTopics: moderatorProcedure
		.input(ListAdminTopicsInputSchema)
		.output(ListAdminTopicsOutputSchema)
		.handler(async ({ input }) => await listAdminTopics(input)),
	listQuestions: moderatorProcedure
		.input(ListAdminQuestionsInputSchema)
		.output(ListAdminQuestionsOutputSchema)
		.handler(async ({ input }) => await listAdminQuestions(input)),
	listClicks: moderatorProcedure
		.input(ListAdminClicksInputSchema)
		.output(ListAdminClicksOutputSchema)
		.handler(async ({ input }) => await listAdminClicks(input)),
	listTopicBulkJobs: moderatorProcedure
		.input(ListAdminTopicBulkJobsInputSchema)
		.output(ListAdminTopicBulkJobsOutputSchema)
		.handler(async ({ input }) => await listAdminTopicBulkJobs(input)),
};
