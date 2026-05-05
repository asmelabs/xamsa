import {
	ListReactorsInputSchema,
	ListReactorsOutputSchema,
	SetReactionInputSchema,
	SetReactionOutputSchema,
} from "@xamsa/schemas/modules/reaction";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { listReactors, setReaction } from "./service";

export const reactionRouter = {
	set: protectedProcedure
		.input(SetReactionInputSchema)
		.output(SetReactionOutputSchema)
		.handler(({ input, context }) =>
			setReaction(input, context.session.user.id),
		),
	listReactors: publicProcedure
		.input(ListReactorsInputSchema)
		.output(ListReactorsOutputSchema)
		.handler(({ input }) => listReactors(input)),
};
