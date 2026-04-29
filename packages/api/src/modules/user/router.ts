import {
	FindOneProfileInputSchema,
	FindOneProfileOutputSchema,
	FollowUserInputSchema,
	FollowUserOutputSchema,
	GetActiveGameOutputSchema,
	GetFollowStateInputSchema,
	GetFollowStateOutputSchema,
	GetGlobalLeaderboardInputSchema,
	GetGlobalLeaderboardOutputSchema,
	GetMyStatsOutputSchema,
	GetPublicGameActivityInputSchema,
	GetPublicGameActivityOutputSchema,
	GetPublicRecentGamesInputSchema,
	GetPublicRecentGamesOutputSchema,
	GetPublicStatsInputSchema,
	GetPublicStatsOutputSchema,
	GetRecentGamesInputSchema,
	GetRecentGamesOutputSchema,
	ListFollowersInputSchema,
	ListFollowersOutputSchema,
	ListFollowingInputSchema,
	ListFollowingOutputSchema,
	UnfollowUserInputSchema,
	UnfollowUserOutputSchema,
	UpdateProfileInputSchema,
	UpdateProfileOutputSchema,
} from "@xamsa/schemas/modules/user";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { getGlobalLeaderboard } from "./global-leaderboard";
import {
	findOneProfile,
	followUser,
	getActiveGame,
	getFollowState,
	getMyStats,
	getPublicGameActivity,
	getPublicRecentGames,
	getPublicStats,
	getRecentGames,
	listFollowers,
	listFollowing,
	unfollowUser,
	updateProfile,
} from "./service";

export const userRouter = {
	findOne: publicProcedure
		.input(FindOneProfileInputSchema)
		.output(FindOneProfileOutputSchema)
		.handler(async ({ input }) => await findOneProfile(input)),
	getPublicStats: publicProcedure
		.input(GetPublicStatsInputSchema)
		.output(GetPublicStatsOutputSchema)
		.handler(async ({ input }) => await getPublicStats(input)),
	getPublicGameActivity: publicProcedure
		.input(GetPublicGameActivityInputSchema)
		.output(GetPublicGameActivityOutputSchema)
		.handler(async ({ input }) => await getPublicGameActivity(input)),
	getPublicRecentGames: publicProcedure
		.input(GetPublicRecentGamesInputSchema)
		.output(GetPublicRecentGamesOutputSchema)
		.handler(async ({ input }) => await getPublicRecentGames(input)),
	getGlobalLeaderboard: publicProcedure
		.input(GetGlobalLeaderboardInputSchema)
		.output(GetGlobalLeaderboardOutputSchema)
		.handler(async ({ input }) => await getGlobalLeaderboard(input)),
	update: protectedProcedure
		.input(UpdateProfileInputSchema)
		.output(UpdateProfileOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateProfile(input, context.session.user.id),
		),
	getActiveGame: protectedProcedure
		.output(GetActiveGameOutputSchema)
		.handler(
			async ({ context }) => await getActiveGame(context.session.user.id),
		),
	getMyStats: protectedProcedure
		.output(GetMyStatsOutputSchema)
		.handler(async ({ context }) => await getMyStats(context.session.user.id)),
	getRecentGames: protectedProcedure
		.input(GetRecentGamesInputSchema)
		.output(GetRecentGamesOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getRecentGames(input, context.session.user.id),
		),
	getFollowState: protectedProcedure
		.input(GetFollowStateInputSchema)
		.output(GetFollowStateOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getFollowState(
					input,
					context.session.user.id,
					context.session.user.username,
				),
		),
	follow: protectedProcedure
		.input(FollowUserInputSchema)
		.output(FollowUserOutputSchema)
		.handler(
			async ({ input, context }) =>
				await followUser(
					input,
					context.session.user.id,
					context.session.user.username,
				),
		),
	unfollow: protectedProcedure
		.input(UnfollowUserInputSchema)
		.output(UnfollowUserOutputSchema)
		.handler(
			async ({ input, context }) =>
				await unfollowUser(
					input,
					context.session.user.id,
					context.session.user.username,
				),
		),
	listFollowers: publicProcedure
		.input(ListFollowersInputSchema)
		.output(ListFollowersOutputSchema)
		.handler(async ({ input }) => await listFollowers(input)),
	listFollowing: publicProcedure
		.input(ListFollowingInputSchema)
		.output(ListFollowingOutputSchema)
		.handler(async ({ input }) => await listFollowing(input)),
};
