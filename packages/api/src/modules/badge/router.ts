import {
	FindBadgeAwardInputSchema,
	FindBadgeAwardOutputSchema,
	GetBadgeCatalogStatsOutputSchema,
	GetPublicBadgeSummaryByUsernameInputSchema,
	GetPublicBadgeSummaryByUsernameOutputSchema,
	ListBadgeEarnersInputSchema,
	ListBadgeEarnersOutputSchema,
	ListPublicAwardsByUsernameInputSchema,
	ListPublicAwardsByUsernameOutputSchema,
} from "@xamsa/schemas/modules/badge";
import { publicProcedure } from "../../procedures";
import {
	findBadgeAward,
	getBadgeCatalogStats,
	getPublicBadgeSummaryByUsername,
	listBadgeEarners,
	listPublicAwardsByUsername,
} from "./service";

export const badgeRouter = {
	listEarners: publicProcedure
		.input(ListBadgeEarnersInputSchema)
		.output(ListBadgeEarnersOutputSchema)
		.handler(async ({ input }) => await listBadgeEarners(input)),
	getPublicSummaryByUsername: publicProcedure
		.input(GetPublicBadgeSummaryByUsernameInputSchema)
		.output(GetPublicBadgeSummaryByUsernameOutputSchema)
		.handler(async ({ input }) => await getPublicBadgeSummaryByUsername(input)),
	listPublicAwardsByUsername: publicProcedure
		.input(ListPublicAwardsByUsernameInputSchema)
		.output(ListPublicAwardsByUsernameOutputSchema)
		.handler(async ({ input }) => await listPublicAwardsByUsername(input)),
	getCatalogStats: publicProcedure
		.output(GetBadgeCatalogStatsOutputSchema)
		.handler(async () => await getBadgeCatalogStats()),
	findAward: publicProcedure
		.input(FindBadgeAwardInputSchema)
		.output(FindBadgeAwardOutputSchema)
		.handler(async ({ input }) => await findBadgeAward(input)),
};
