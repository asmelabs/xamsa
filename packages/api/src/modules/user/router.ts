import {
	FindOneProfileInputSchema,
	FindOneProfileOutputSchema,
} from "@xamsa/schemas/modules/user";
import { publicProcedure } from "../../procedures";
import { findOneProfile } from "./service";

export const userRouter = {
	findOne: publicProcedure
		.input(FindOneProfileInputSchema)
		.output(FindOneProfileOutputSchema)
		.handler(async ({ input }) => await findOneProfile(input)),
};
