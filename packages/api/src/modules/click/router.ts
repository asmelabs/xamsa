import {
	ClickBuzzInputSchema,
	ClickBuzzOutputSchema,
	ClickRemoveInputSchema,
	ClickRemoveOutputSchema,
	ClickResolveInputSchema,
	ClickResolveOutputSchema,
} from "@xamsa/schemas/modules/click";
import { verifiedProcedure } from "../../procedures";
import { removeClick } from "./remove-click";
import { buzzClick, resolveClick } from "./service";

export const clickRouter = {
	buzz: verifiedProcedure
		.input(ClickBuzzInputSchema)
		.output(ClickBuzzOutputSchema)
		.handler(
			async ({ input, context }) =>
				await buzzClick(input, context.session.user.id),
		),
	resolve: verifiedProcedure
		.input(ClickResolveInputSchema)
		.output(ClickResolveOutputSchema)
		.handler(
			async ({ input, context }) =>
				await resolveClick(input, context.session.user.id),
		),
	remove: verifiedProcedure
		.input(ClickRemoveInputSchema)
		.output(ClickRemoveOutputSchema)
		.handler(
			async ({ input, context }) =>
				await removeClick(input, context.session.user.id),
		),
};
