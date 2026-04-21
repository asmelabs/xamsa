import {
	PlayerJoinInputSchema,
	PlayerJoinOutputSchema,
	PlayerKickInputSchema,
	PlayerKickOutputSchema,
	PlayerLeaveInputSchema,
	PlayerLeaveOutputSchema,
} from "@xamsa/schemas/modules/player";
import { protectedProcedure } from "../../procedures";
import { joinPlayer, kickPlayer, leavePlayer } from "./service";

export const playerRouter = {
	join: protectedProcedure
		.input(PlayerJoinInputSchema)
		.output(PlayerJoinOutputSchema)
		.handler(
			async ({ input, context }) =>
				await joinPlayer(input, context.session.user.id),
		),
	leave: protectedProcedure
		.input(PlayerLeaveInputSchema)
		.output(PlayerLeaveOutputSchema)
		.handler(
			async ({ input, context }) =>
				await leavePlayer(input, context.session.user.id),
		),
	kick: protectedProcedure
		.input(PlayerKickInputSchema)
		.output(PlayerKickOutputSchema)
		.handler(
			async ({ input, context }) =>
				await kickPlayer(input, context.session.user.id),
		),
};
