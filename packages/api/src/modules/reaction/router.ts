import {
	SetReactionInputSchema,
	SetReactionOutputSchema,
} from "@xamsa/schemas/modules/reaction";
import { protectedProcedure } from "../../procedures";
import { setReaction } from "./service";

export const reactionRouter = {
	set: protectedProcedure
		.input(SetReactionInputSchema)
		.output(SetReactionOutputSchema)
		.handler(({ input, context }) =>
			setReaction(input, context.session.user.id),
		),
};
