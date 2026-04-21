import {
	ClickBuzzInputSchema,
	ClickBuzzOutputSchema,
	ClickResolveInputSchema,
	ClickResolveOutputSchema,
} from "@xamsa/schemas/modules/click";
import { protectedProcedure } from "../../procedures";
import { buzzClick, resolveClick } from "./service";

export const clickRouter = {
	buzz: protectedProcedure
		.input(ClickBuzzInputSchema)
		.output(ClickBuzzOutputSchema)
		.handler(
			async ({ input, context }) =>
				await buzzClick(input, context.session.user.id),
		),
	resolve: protectedProcedure
		.input(ClickResolveInputSchema)
		.output(ClickResolveOutputSchema)
		.handler(
			async ({ input, context }) =>
				await resolveClick(input, context.session.user.id),
		),
};
