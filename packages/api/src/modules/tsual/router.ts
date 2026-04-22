import {
	FindOnePackageInputSchema,
	FindOnePackageOutputSchema,
	ListTsualPackagesInputSchema,
	ListTsualPackagesResponseSchema,
	PreviewTsualImportInputSchema,
	PreviewTsualImportOutputSchema,
} from "@xamsa/schemas/modules/tsual";
import { moderatorProcedure, protectedProcedure } from "../../procedures";
import {
	getTsualForUse,
	listTsualForHome,
	previewTsualImport,
} from "./service";

export const tsualRouter = {
	listForHome: protectedProcedure
		.input(ListTsualPackagesInputSchema)
		.output(ListTsualPackagesResponseSchema)
		.handler(async ({ input }) => listTsualForHome(input)),
	getForUse: protectedProcedure
		.input(FindOnePackageInputSchema)
		.output(FindOnePackageOutputSchema)
		.handler(async ({ input }) => getTsualForUse(input)),
	previewImport: moderatorProcedure
		.input(PreviewTsualImportInputSchema)
		.output(PreviewTsualImportOutputSchema)
		.handler(
			async ({ input, context }) =>
				await previewTsualImport(input, context.session.user.id),
		),
};
