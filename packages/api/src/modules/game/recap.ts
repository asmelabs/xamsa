import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import type {
	GetCompletedGameRecapInputType,
	GetCompletedGameRecapOutputType,
} from "@xamsa/schemas/modules/game";
import { isBadgeId } from "@xamsa/utils/badges";

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
			packId: true,
			pack: {
				select: {
					slug: true,
					name: true,
					pdr: true,
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

	const packHasRatedDifficulty =
		(await prisma.question.count({
			where: {
				topic: { packId: game.packId },
				qdrScoredAttempts: { gt: 0 },
			},
		})) > 0;

	const playerIds = game.players.map((p) => p.id);

	const [gameTopics, allClicks, rawBadgeAwards] = await Promise.all([
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
						tdr: true,
						questions: { select: { qdrScoredAttempts: true } },
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
								qdr: true,
								qdrScoredAttempts: true,
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
		prisma.playerBadgeAward.findMany({
			where: { playerId: { in: playerIds } },
			orderBy: { earnedAt: "asc" },
			select: {
				id: true,
				badgeId: true,
				playerId: true,
				earnedAt: true,
				gameTopic: {
					select: {
						order: true,
						topic: { select: { slug: true, name: true } },
					},
				},
				gameQuestion: {
					select: {
						order: true,
						gameTopic: {
							select: {
								order: true,
								topic: { select: { slug: true, name: true } },
							},
						},
					},
				},
			},
		}),
	]);

	const badgeAwards: GetCompletedGameRecapOutputType["badgeAwards"] = [];
	for (const row of rawBadgeAwards) {
		if (!isBadgeId(row.badgeId)) continue;
		const topicFromGt = row.gameTopic;
		const gq = row.gameQuestion;
		const topicFromGq = gq?.gameTopic;
		const topicOrder = topicFromGt?.order ?? topicFromGq?.order ?? null;
		const topicSlug =
			topicFromGt?.topic.slug ?? topicFromGq?.topic.slug ?? null;
		const topicName =
			topicFromGt?.topic.name ?? topicFromGq?.topic.name ?? null;

		badgeAwards.push({
			id: row.id,
			badgeId: row.badgeId,
			playerId: row.playerId,
			earnedAt: row.earnedAt,
			topicOrder,
			topicSlug,
			topicName,
			questionOrder: gq?.order ?? null,
		});
	}

	const clicksByQuestionId = new Map<string, typeof allClicks>();
	for (const c of allClicks) {
		const list = clicksByQuestionId.get(c.questionId) ?? [];
		list.push(c);
		clicksByQuestionId.set(c.questionId, list);
	}

	const emptyScoreMap = (): Record<string, number> => {
		const o: Record<string, number> = {};
		for (const id of playerIds) o[id] = 0;
		return o;
	};

	const cumulative = emptyScoreMap();
	const scoreTimeline: {
		stepIndex: number;
		label: string;
		scoresByPlayerId: Record<string, number>;
	}[] = [{ stepIndex: 0, label: "Start", scoresByPlayerId: { ...cumulative } }];
	let nextStep = 1;

	for (const gt of gameTopics) {
		for (const gq of gt.questions) {
			const rawClicks = clicksByQuestionId.get(gq.question.id) ?? [];
			for (const c of rawClicks) {
				cumulative[c.playerId] =
					(cumulative[c.playerId] ?? 0) + c.pointsAwarded;
			}
			scoreTimeline.push({
				stepIndex: nextStep++,
				label: `R${gt.order} Q${gq.order}`,
				scoresByPlayerId: { ...cumulative },
			});
		}
	}

	const roundPerformance: {
		playerId: string;
		playerName: string;
		topicOrder: number;
		topicName: string;
		totalQuestions: number;
		questionsCorrect: number;
	}[] = [];
	for (const p of game.players) {
		const playerName = p.user.name?.trim() || "Player";
		for (const gt of gameTopics) {
			const totalQuestions = gt.questions.length;
			const questionsCorrect = gt.questions.filter(
				(gq) => gq.winnerId === p.id,
			).length;
			roundPerformance.push({
				playerId: p.id,
				playerName,
				topicOrder: gt.order,
				topicName: gt.topic.name,
				totalQuestions,
				questionsCorrect,
			});
		}
	}

	const topics = gameTopics.map((gt) => {
		const hasRatedDifficulty = gt.topic.questions.some(
			(q) => q.qdrScoredAttempts > 0,
		);
		return {
			order: gt.order,
			topicName: gt.topic.name,
			topicSlug: gt.topic.slug,
			tdr: gt.topic.tdr,
			hasRatedDifficulty,
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
					qdr: gq.question.qdr,
					qdrScoredAttempts: gq.question.qdrScoredAttempts,
					clicks,
				};
			}),
		};
	});

	const players = game.players.map(({ userId: _, ...p }) => p);

	return {
		code: game.code,
		startedAt: game.startedAt,
		finishedAt: game.finishedAt,
		durationSeconds: game.durationSeconds,
		pack: { ...game.pack, hasRatedDifficulty: packHasRatedDifficulty },
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
		scoreTimeline,
		roundPerformance,
		badgeAwards,
	};
}
