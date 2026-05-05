import {
	BulkCreatePacksInputSchema,
	BulkCreatePacksOutputSchema,
	CreatePackInputSchema,
	CreatePackOutputSchema,
	DeletePackInputSchema,
	DeletePackOutputSchema,
	ExportPackInputSchema,
	ExportPackOutputSchema,
	FindOnePackInputSchema,
	FindOnePackOutputSchema,
	ListPacksInputSchema,
	ListPacksOutputSchema,
	UpdatePackInputSchema,
	UpdatePackOutputSchema,
	UpdatePackStatusInputSchema,
	UpdatePackStatusOutputSchema,
} from "@xamsa/schemas/modules/pack";
import { PackAnalyticsOutputSchema } from "@xamsa/schemas/modules/public-analytics";
import { publicProcedure, verifiedProcedure } from "../../procedures";
import { exportPack } from "./export";
import {
	bulkCreatePacks,
	createPack,
	deletePack,
	findOnePack,
	getPackAnalytics,
	listPacks,
	updatePack,
	updatePackStatus,
} from "./service";

export const packRouter = {
	create: verifiedProcedure
		.input(CreatePackInputSchema)
		.output(CreatePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createPack(input, context.session.user.id),
		),
	bulkCreate: verifiedProcedure
		.input(BulkCreatePacksInputSchema)
		.output(BulkCreatePacksOutputSchema)
		.handler(
			async ({ input, context }) =>
				await bulkCreatePacks(input, context.session.user.id),
		),
	update: verifiedProcedure
		.input(UpdatePackInputSchema)
		.output(UpdatePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updatePack(input, context.session.user.id),
		),
	updateStatus: verifiedProcedure
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
	getAnalytics: publicProcedure
		.input(FindOnePackInputSchema)
		.output(PackAnalyticsOutputSchema)
		.handler(
			async ({ input, context }) =>
				await getPackAnalytics(input.slug, context.session?.user.id),
		),
	list: publicProcedure
		.input(ListPacksInputSchema)
		.output(ListPacksOutputSchema)
		.handler(
			async ({ input, context }) =>
				await listPacks(input, context.session?.user.id),
		),
	delete: verifiedProcedure
		.input(DeletePackInputSchema)
		.output(DeletePackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await deletePack(input, context.session.user.id),
		),
	export: verifiedProcedure
		.input(ExportPackInputSchema)
		.output(ExportPackOutputSchema)
		.handler(
			async ({ input, context }) =>
				await exportPack(input, context.session.user.id),
		),
};
