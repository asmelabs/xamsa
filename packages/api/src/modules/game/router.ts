import {
	AdvanceQuestionInputSchema,
	AdvanceQuestionOutputSchema,
	CompleteGameInputSchema,
	CompleteGameOutputSchema,
	CreateGameInputSchema,
	CreateGameOutputSchema,
	DeleteGameInputSchema,
	DeleteGameOutputSchema,
	FindOneGameInputSchema,
	FindOneGameOutputSchema,
	GameStartInputSchema,
	GameStartOutputSchema,
	GetCompletedGameRecapInputSchema,
	GetCompletedGameRecapOutputSchema,
	HandleHostDisconnectInputSchema,
	HandleHostDisconnectOutputSchema,
	LeaveAsHostInputSchema,
	LeaveAsHostOutputSchema,
	ListPublicGameHistoryInputSchema,
	ListPublicGameHistoryOutputSchema,
	RevealQuestionInputSchema,
	RevealQuestionOutputSchema,
	SkipQuestionInputSchema,
	SkipQuestionOutputSchema,
	UpdateGameStatusInputSchema,
	UpdateGameStatusOutputSchema,
} from "@xamsa/schemas/modules/game";
import { protectedProcedure, publicProcedure } from "../../procedures";
import { listPublicGameHistory } from "./public-history";
import { getCompletedGameRecap } from "./recap";
import {
	advanceQuestion,
	completeGame,
	createGame,
	deleteGame,
	findOneGame,
	handleHostDisconnect,
	leaveAsHost,
	revealQuestion,
	skipQuestion,
	startGame,
	updateGameStatus,
} from "./service";

export const gameRouter = {
	create: protectedProcedure
		.input(CreateGameInputSchema)
		.output(CreateGameOutputSchema)
		.handler(
			async ({ input, context }) =>
				await createGame(input, context.session.user.id),
		),
	delete: protectedProcedure
		.input(DeleteGameInputSchema)
		.output(DeleteGameOutputSchema)
		.handler(
			async ({ input, context }) =>
				await deleteGame(input, context.session.user.id),
		),
	findOne: publicProcedure
		.input(FindOneGameInputSchema)
		.output(FindOneGameOutputSchema)
		.handler(
			async ({ input, context }) =>
				await findOneGame(input, context.session?.user.id),
		),
	getCompletedRecap: publicProcedure
		.input(GetCompletedGameRecapInputSchema)
		.output(GetCompletedGameRecapOutputSchema)
		.handler(async ({ input }) => await getCompletedGameRecap(input)),
	listPublicHistory: publicProcedure
		.input(ListPublicGameHistoryInputSchema)
		.output(ListPublicGameHistoryOutputSchema)
		.handler(async ({ input }) => await listPublicGameHistory(input)),
	updateStatus: protectedProcedure
		.input(UpdateGameStatusInputSchema)
		.output(UpdateGameStatusOutputSchema)
		.handler(
			async ({ input, context }) =>
				await updateGameStatus(input, context.session.user.id),
		),
	start: protectedProcedure
		.input(GameStartInputSchema)
		.output(GameStartOutputSchema)
		.handler(
			async ({ input, context }) =>
				await startGame(input, context.session.user.id),
		),
	revealQuestion: protectedProcedure
		.input(RevealQuestionInputSchema)
		.output(RevealQuestionOutputSchema)
		.handler(
			async ({ input, context }) =>
				await revealQuestion(input, context.session.user.id),
		),
	advanceQuestion: protectedProcedure
		.input(AdvanceQuestionInputSchema)
		.output(AdvanceQuestionOutputSchema)
		.handler(
			async ({ input, context }) =>
				await advanceQuestion(input, context.session.user.id),
		),
	skipQuestion: protectedProcedure
		.input(SkipQuestionInputSchema)
		.output(SkipQuestionOutputSchema)
		.handler(
			async ({ input, context }) =>
				await skipQuestion(input, context.session.user.id),
		),
	completeGame: protectedProcedure
		.input(CompleteGameInputSchema)
		.output(CompleteGameOutputSchema)
		.handler(
			async ({ input, context }) =>
				await completeGame(input, context.session.user.id),
		),
	leaveAsHost: protectedProcedure
		.input(LeaveAsHostInputSchema)
		.output(LeaveAsHostOutputSchema)
		.handler(
			async ({ input, context }) =>
				await leaveAsHost(input, context.session.user.id),
		),
	handleHostDisconnect: protectedProcedure
		.input(HandleHostDisconnectInputSchema)
		.output(HandleHostDisconnectOutputSchema)
		.handler(
			async ({ input, context }) =>
				await handleHostDisconnect(input, context.session.user.id),
		),
};
