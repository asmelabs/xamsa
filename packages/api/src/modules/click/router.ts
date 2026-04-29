import {
	ClickBuzzInputSchema,
	ClickBuzzOutputSchema,
	ClickRemoveInputSchema,
	ClickRemoveOutputSchema,
	ClickResolveInputSchema,
	ClickResolveOutputSchema,
} from "@xamsa/schemas/modules/click";
import { protectedProcedure } from "../../procedures";
import { removeClick } from "./remove-click";
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
	remove: protectedProcedure
		.input(ClickRemoveInputSchema)
		.output(ClickRemoveOutputSchema)
		.handler(
			async ({ input, context }) =>
				await removeClick(input, context.session.user.id),
		),
};
