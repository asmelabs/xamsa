import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	GetCompletedGameRecapInputType,
	GetCompletedGameRecapOutputType,
} from "@xamsa/schemas/modules/game";

export async function getCompletedGameRecap(
	input: GetCompletedGameRecapInputType,
): Promise<GetCompletedGameRecapOutputType> {
	const game = await prisma.game.findUnique({
		where: { code: input.code },
		select: {
			id: true,
			code: true,
			status: true,
			startedAt: true,
			finishedAt: true,
			durationSeconds: true,
			winnerId: true,
			totalTopics: true,
			totalQuestions: true,
			totalSkippedQuestions: true,
			totalAnswers: true,
			totalCorrectAnswers: true,
			totalIncorrectAnswers: true,
			totalExpiredAnswers: true,
			totalPointsAwarded: true,
			totalPointsDeducted: true,
			pack: {
				select: {
					slug: true,
					name: true,
				},
			},
			players: {
				select: {
					id: true,
					score: true,
					rank: true,
					status: true,
					joinedAt: true,
					leftAt: true,
					userId: true,
					peakScore: true,
					lowestScore: true,
					totalClicks: true,
					correctAnswers: true,
					incorrectAnswers: true,
					expiredClicks: true,
					firstClicks: true,
					lastClicks: true,
					fastestClickMs: true,
					averageClickMs: true,
					longestCorrectStreak: true,
					longestWrongStreak: true,
					topicsPlayed: true,
					user: {
						select: {
							username: true,
							name: true,
							image: true,
						},
					},
				},
				orderBy: { joinedAt: "asc" },
			},
		},
	});

	if (!game) {
		throw new ORPCError("NOT_FOUND", {
			message: `Game with code "${input.code}" not found`,
		});
	}

	if (game.status !== "completed") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Game stats are only available after the game is completed",
		});
	}

	if (game.startedAt == null) {
		throw new ORPCError("NOT_FOUND", {
			message: "This session was closed before the game started",
		});
	}

	const [gameTopics, allClicks] = await Promise.all([
		prisma.gameTopic.findMany({
			where: { gameId: game.id },
			orderBy: { order: "asc" },
			select: {
				order: true,
				durationSeconds: true,
				totalClicks: true,
				totalCorrectAnswers: true,
				totalIncorrectAnswers: true,
				totalExpiredClicks: true,
				totalQuestionsAnswered: true,
				totalQuestionsSkipped: true,
				topic: {
					select: {
						slug: true,
						name: true,
					},
				},
				questions: {
					orderBy: { order: "asc" },
					select: {
						order: true,
						points: true,
						status: true,
						wasSkipped: true,
						wasRevealed: true,
						firstBuzzMs: true,
						durationSeconds: true,
						totalClicks: true,
						totalCorrectAnswers: true,
						totalIncorrectAnswers: true,
						totalExpiredClicks: true,
						winnerId: true,
						question: {
							select: {
								id: true,
								text: true,
								answer: true,
							},
						},
						winner: {
							select: {
								id: true,
								user: { select: { name: true } },
							},
						},
					},
				},
			},
		}),
		prisma.click.findMany({
			where: { gameId: game.id },
			select: {
				id: true,
				position: true,
				status: true,
				clickedAt: true,
				answeredAt: true,
				reactionMs: true,
				pointsAwarded: true,
				playerId: true,
				questionId: true,
				player: {
					select: {
						user: { select: { name: true } },
					},
				},
			},
			orderBy: [{ questionId: "asc" }, { position: "asc" }],
		}),
	]);

	const clicksByQuestionId = new Map<string, typeof allClicks>();
	for (const c of allClicks) {
		const list = clicksByQuestionId.get(c.questionId) ?? [];
		list.push(c);
		clicksByQuestionId.set(c.questionId, list);
	}

	const topics = gameTopics.map((gt) => ({
		order: gt.order,
		topicName: gt.topic.name,
		topicSlug: gt.topic.slug,
		durationSeconds: gt.durationSeconds,
		totalClicks: gt.totalClicks,
		totalCorrectAnswers: gt.totalCorrectAnswers,
		totalIncorrectAnswers: gt.totalIncorrectAnswers,
		totalExpiredClicks: gt.totalExpiredClicks,
		totalQuestionsAnswered: gt.totalQuestionsAnswered,
		totalQuestionsSkipped: gt.totalQuestionsSkipped,
		questions: gt.questions.map((gq) => {
			const rawClicks = clicksByQuestionId.get(gq.question.id) ?? [];
			const clicks = rawClicks.map((c) => ({
				id: c.id,
				position: c.position,
				status: c.status,
				clickedAt: c.clickedAt,
				answeredAt: c.answeredAt,
				reactionMs: c.reactionMs,
				pointsAwarded: c.pointsAwarded,
				playerId: c.playerId,
				playerName: c.player.user.name ?? "Player",
			}));

			return {
				order: gq.order,
				points: gq.points,
				status: gq.status,
				wasSkipped: gq.wasSkipped,
				wasRevealed: gq.wasRevealed,
				text: gq.question.text,
				answer: gq.question.answer,
				winnerPlayerId: gq.winner?.id ?? null,
				winnerName: gq.winner?.user?.name ?? null,
				firstBuzzMs: gq.firstBuzzMs,
				durationSeconds: gq.durationSeconds,
				totalClicks: gq.totalClicks,
				totalCorrectAnswers: gq.totalCorrectAnswers,
				totalIncorrectAnswers: gq.totalIncorrectAnswers,
				totalExpiredClicks: gq.totalExpiredClicks,
				clicks,
			};
		}),
	}));

	const players = game.players.map(({ userId: _, ...p }) => p);

	return {
		code: game.code,
		startedAt: game.startedAt,
		finishedAt: game.finishedAt,
		durationSeconds: game.durationSeconds,
		pack: game.pack,
		winnerId: game.winnerId,
		totals: {
			totalTopics: game.totalTopics,
			totalQuestions: game.totalQuestions,
			totalSkippedQuestions: game.totalSkippedQuestions,
			totalAnswers: game.totalAnswers,
			totalCorrectAnswers: game.totalCorrectAnswers,
			totalIncorrectAnswers: game.totalIncorrectAnswers,
			totalExpiredAnswers: game.totalExpiredAnswers,
			totalPointsAwarded: game.totalPointsAwarded,
			totalPointsDeducted: game.totalPointsDeducted,
		},
		players,
		topics,
	};
}
