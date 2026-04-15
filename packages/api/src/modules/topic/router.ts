import {
	CreateTopicInputSchema,
	CreateTopicOutputSchema,
	FindOneTopicInputSchema,
	FindOneTopicOutputSchema,
} from "@xamsa/schemas/modules/topic";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { createTopic, findOneTopic } from "./service";

export const topicRouter = {
	create: protectedProcedure
		.input(CreateTopicInputSchema)
		.output(CreateTopicOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createTopic(input, context.session.user.id),
		),
	// findOne: publicProcedure
	// 	.input(FindOneTopicInputSchema)
	// 	.output(FindOneTopicOutputSchema)
	// 	.handler(
	// 		async ({ input, context }) =>
	// 			await findOneTopic(input, context.session?.user.id),
	// 	),
};
