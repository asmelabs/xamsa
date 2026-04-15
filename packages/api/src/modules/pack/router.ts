import {
	CreatePackInputSchema,
	CreatePackOutputSchema,
	FindOnePackInputSchema,
	FindOnePackOutputSchema,
} from "@xamsa/schemas/modules/pack";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { createPack, findOnePack } from "./service";

export const packRouter = {
	create: protectedProcedure
		.input(CreatePackInputSchema)
		.output(CreatePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createPack(input, context.session.user.id),
		),
	findOne: publicProcedure
		.input(FindOnePackInputSchema)
		.output(FindOnePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await findOnePack(input, context.session?.user.id),
		),
};
