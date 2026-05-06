import { ORPCError } from "@orpc/server";
import {
	HomeSearchInputSchema,
	HomeSearchOutputSchema,
} from "@xamsa/schemas/modules/search";
import {
	FindOneProfileInputSchema,
	FindOneProfileOutputSchema,
	FollowUserInputSchema,
	FollowUserOutputSchema,
	GetActiveGameOutputSchema,
	GetEloHistoryInputSchema,
	GetEloHistoryOutputSchema,
	GetFollowStateInputSchema,
	GetFollowStateOutputSchema,
	GetGlobalLeaderboardInputSchema,
	GetGlobalLeaderboardOutputSchema,
	GetMyStatsOutputSchema,
	GetPublicGameActivityInputSchema,
	GetPublicGameActivityOutputSchema,
	GetPublicPlayStreakInputSchema,
	GetPublicPlayStreakOutputSchema,
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
	MentionCandidatesInputSchema,
	MentionCandidatesOutputSchema,
	RemoveUserAvatarInputSchema,
	RemoveUserAvatarOutputSchema,
	SetUserAvatarInputSchema,
	SetUserAvatarOutputSchema,
	UnfollowUserInputSchema,
	UnfollowUserOutputSchema,
	UpdateProfileInputSchema,
	UpdateProfileOutputSchema,
} from "@xamsa/schemas/modules/user";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { getGlobalLeaderboard } from "./global-leaderboard";
import { homeSearch } from "./home-search";
import {
	findOneProfile,
	followUser,
	getActiveGame,
	getEloHistory,
	getFollowState,
	getMyStats,
	getPublicGameActivity,
	getPublicPlayStreak,
	getPublicRecentGames,
	getPublicStats,
	getRecentGames,
	listFollowers,
	listFollowing,
	mentionCandidates,
	removeUserAvatar,
	setUserAvatar,
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
	getPublicPlayStreak: publicProcedure
		.input(GetPublicPlayStreakInputSchema)
		.output(GetPublicPlayStreakOutputSchema)
		.handler(async ({ input }) => await getPublicPlayStreak(input)),
	getEloHistory: publicProcedure
		.input(GetEloHistoryInputSchema)
		.output(GetEloHistoryOutputSchema)
		.handler(async ({ input }) => await getEloHistory(input)),
	getPublicRecentGames: publicProcedure
		.input(GetPublicRecentGamesInputSchema)
		.output(GetPublicRecentGamesOutputSchema)
		.handler(async ({ input }) => await getPublicRecentGames(input)),
	getGlobalLeaderboard: publicProcedure
		.input(GetGlobalLeaderboardInputSchema)
		.output(GetGlobalLeaderboardOutputSchema)
		.handler(async ({ input, context }) => {
			if (input.onlyFollowing && !context.session?.user?.id) {
				throw new ORPCError("UNAUTHORIZED", {
					message: "Sign in to filter the leaderboard by people you follow.",
				});
			}
			return getGlobalLeaderboard(input, context.session?.user?.id);
		}),
	homeSearch: publicProcedure
		.input(HomeSearchInputSchema)
		.output(HomeSearchOutputSchema)
		.handler(async ({ input, context }) =>
			homeSearch(input, context.session?.user?.id),
		),
	mentionCandidates: protectedProcedure
		.input(MentionCandidatesInputSchema)
		.output(MentionCandidatesOutputSchema)
		.handler(async ({ input, context }) =>
			mentionCandidates(input, context.session.user.id),
		),
	update: protectedProcedure
		.input(UpdateProfileInputSchema)
		.output(UpdateProfileOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateProfile(input, context.session.user.id),
		),
	setAvatar: protectedProcedure
		.input(SetUserAvatarInputSchema)
		.output(SetUserAvatarOutputSchema)
		.handler(
			async ({ input, context }) =>
				await setUserAvatar(input, context.session.user.id),
		),
	removeAvatar: protectedProcedure
		.input(RemoveUserAvatarInputSchema)
		.output(RemoveUserAvatarOutputSchema)
		.handler(
			async ({ context }) => await removeUserAvatar(context.session.user.id),
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
		.handler(
			async ({ input, context }) =>
				await listFollowers(input, context.session?.user?.id ?? null),
		),
	listFollowing: publicProcedure
		.input(ListFollowingInputSchema)
		.output(ListFollowingOutputSchema)
		.handler(
			async ({ input, context }) =>
				await listFollowing(input, context.session?.user?.id ?? null),
		),
};
