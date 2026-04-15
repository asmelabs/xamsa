import {
	CreatePackInputSchema,
	CreatePackOutputSchema,
	FindOnePackInputSchema,
	FindOnePackOutputSchema,
	UpdatePackStatusInputSchema,
	UpdatePackStatusOutputSchema,
} from "@xamsa/schemas/modules/pack";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { createPack, findOnePack, updatePackStatus } from "./service";

export const packRouter = {
	create: protectedProcedure
		.input(CreatePackInputSchema)
		.output(CreatePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createPack(input, context.session.user.id),
		),
	updateStatus: protectedProcedure
		.input(UpdatePackStatusInputSchema)
		.output(UpdatePackStatusOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updatePackStatus(input, context.session.user.id),
		),
	findOne: publicProcedure
		.input(FindOnePackInputSchema)
		.output(FindOnePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await findOnePack(input, context.session?.user.id),
		),
};
