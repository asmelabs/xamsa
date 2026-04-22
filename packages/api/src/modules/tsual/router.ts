import {
	FindOnePackageInputSchema,
	FindOnePackageOutputSchema,
	ListTsualPackagesInputSchema,
	ListTsualPackagesResponseSchema,
	PreviewTsualImportOutputSchema,
} from "@xamsa/schemas/modules/tsual";
import { protectedProcedure } from "../../procedures";
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
	previewImport: protectedProcedure
		.input(FindOnePackageInputSchema)
		.output(PreviewTsualImportOutputSchema)
		.handler(async ({ input }) => previewTsualImport(input)),
};
