import {
	CreatePackInputSchema,
	CreatePackOutputSchema,
	DeletePackInputSchema,
	DeletePackOutputSchema,
	FindOnePackInputSchema,
	FindOnePackOutputSchema,
	ListPacksInputSchema,
	ListPacksOutputSchema,
	UpdatePackInputSchema,
	UpdatePackOutputSchema,
	UpdatePackStatusInputSchema,
	UpdatePackStatusOutputSchema,
} from "@xamsa/schemas/modules/pack";
import { protectedProcedure, publicProcedure } from "../../procedures";
import {
	createPack,
	deletePack,
	findOnePack,
	listPacks,
	updatePack,
	updatePackStatus,
} from "./service";

export const packRouter = {
	create: protectedProcedure
		.input(CreatePackInputSchema)
		.output(CreatePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createPack(input, context.session.user.id),
		),
	update: protectedProcedure
		.input(UpdatePackInputSchema)
		.output(UpdatePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updatePack(input, context.session.user.id),
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
	list: publicProcedure
		.input(ListPacksInputSchema)
		.output(ListPacksOutputSchema)
		.handler(
			async ({ input, context }) =>
				await listPacks(input, context.session?.user.id),
		),
	delete: protectedProcedure
		.input(DeletePackInputSchema)
		.output(DeletePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await deletePack(input, context.session.user.id),
		),
};
