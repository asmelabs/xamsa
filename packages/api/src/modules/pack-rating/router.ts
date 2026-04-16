import {
	CreatePackRatingInputSchema,
	CreatePackRatingOutputSchema,
} from "@xamsa/schemas/modules/pack-rating";
import { protectedProcedure } from "../../procedures";
import { createPackRating } from "./service";

export const packRatingRouter = {
	create: protectedProcedure
		.input(CreatePackRatingInputSchema)
		.output(CreatePackRatingOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createPackRating(input, context.session.user.id),
		),
};
