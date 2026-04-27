import {
	GetPublicBadgeSummaryByUsernameInputSchema,
	GetPublicBadgeSummaryByUsernameOutputSchema,
	ListBadgeEarnersInputSchema,
	ListBadgeEarnersOutputSchema,
} from "@xamsa/schemas/modules/badge";
import { publicProcedure } from "../../procedures";
import { getPublicBadgeSummaryByUsername, listBadgeEarners } from "./service";

export const badgeRouter = {
	listEarners: publicProcedure
		.input(ListBadgeEarnersInputSchema)
		.output(ListBadgeEarnersOutputSchema)
		.handler(async ({ input }) => await listBadgeEarners(input)),
	getPublicSummaryByUsername: publicProcedure
		.input(GetPublicBadgeSummaryByUsernameInputSchema)
		.output(GetPublicBadgeSummaryByUsernameOutputSchema)
		.handler(async ({ input }) => await getPublicBadgeSummaryByUsername(input)),
};
