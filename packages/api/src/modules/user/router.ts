import {
	FindOneProfileInputSchema,
	FindOneProfileOutputSchema,
	GetActiveGameOutputSchema,
	GetMyStatsOutputSchema,
	GetRecentGamesInputSchema,
	GetRecentGamesOutputSchema,
	UpdateProfileInputSchema,
	UpdateProfileOutputSchema,
} from "@xamsa/schemas/modules/user";
import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	findOneProfile,
	getActiveGame,
	getMyStats,
	getRecentGames,
	updateProfile,
} from "./service";

export const userRouter = {
	findOne: publicProcedure
		.input(FindOneProfileInputSchema)
		.output(FindOneProfileOutputSchema)
		.handler(async ({ input }) => await findOneProfile(input)),
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
