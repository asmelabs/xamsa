import {
	GetAdminOverviewOutputSchema,
	ListAdminBadgesInputSchema,
	ListAdminBadgesOutputSchema,
	ListAdminClicksInputSchema,
	ListAdminClicksOutputSchema,
	ListAdminCommentsInputSchema,
	ListAdminCommentsOutputSchema,
	ListAdminGamesInputSchema,
	ListAdminGamesOutputSchema,
	ListAdminPacksInputSchema,
	ListAdminPacksOutputSchema,
	ListAdminPostsInputSchema,
	ListAdminPostsOutputSchema,
	ListAdminQuestionsInputSchema,
	ListAdminQuestionsOutputSchema,
	ListAdminTopicBulkJobsInputSchema,
	ListAdminTopicBulkJobsOutputSchema,
	ListAdminTopicsInputSchema,
	ListAdminTopicsOutputSchema,
	ListAdminUsersInputSchema,
	ListAdminUsersOutputSchema,
	UpdateUserRoleInputSchema,
	UpdateUserRoleOutputSchema,
} from "@xamsa/schemas/modules/admin";
import { adminProcedure, moderatorProcedure } from "../../procedures";
import { getAdminOverview } from "./overview";
import {
	listAdminBadges,
	listAdminClicks,
	listAdminComments,
	listAdminGames,
	listAdminPacks,
	listAdminPosts,
	listAdminQuestions,
	listAdminTopicBulkJobs,
	listAdminTopics,
	listAdminUsers,
} from "./service";
import { updateUserRole } from "./update-user-role";

export const adminRouter = {
	getOverview: moderatorProcedure
		.output(GetAdminOverviewOutputSchema)
		.handler(async () => await getAdminOverview()),
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
	listPosts: moderatorProcedure
		.input(ListAdminPostsInputSchema)
		.output(ListAdminPostsOutputSchema)
		.handler(async ({ input }) => await listAdminPosts(input)),
	listComments: moderatorProcedure
		.input(ListAdminCommentsInputSchema)
		.output(ListAdminCommentsOutputSchema)
		.handler(async ({ input }) => await listAdminComments(input)),
	updateUserRole: adminProcedure
		.input(UpdateUserRoleInputSchema)
		.output(UpdateUserRoleOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateUserRole(input, context.session.user.id),
		),
};
