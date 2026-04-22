import {
	FindOneProfileInputSchema,
	FindOneProfileOutputSchema,
	GetActiveGameOutputSchema,
	GetGlobalLeaderboardInputSchema,
	GetGlobalLeaderboardOutputSchema,
	GetMyStatsOutputSchema,
	GetPublicRecentGamesInputSchema,
	GetPublicRecentGamesOutputSchema,
	GetPublicStatsInputSchema,
	GetPublicStatsOutputSchema,
	GetRecentGamesInputSchema,
	GetRecentGamesOutputSchema,
	UpdateProfileInputSchema,
	UpdateProfileOutputSchema,
} from "@xamsa/schemas/modules/user";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { getGlobalLeaderboard } from "./global-leaderboard";
import {
	findOneProfile,
	getActiveGame,
	getMyStats,
	getPublicRecentGames,
	getPublicStats,
	getRecentGames,
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
};
