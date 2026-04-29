import prisma from "@xamsa/db";
import type {
	PackAnalyticsOutputType,
	QuestionAnalyticsOutputType,
	TopicAnalyticsOutputType,
} from "@xamsa/schemas/modules/public-analytics";

const COMPLETED_GAME = {
	status: "completed" as const,
	startedAt: { not: null },
};

function clickMixFromCounts(parts: {
	correct: number;
	wrong: number;
	expired: number;
	pending: number;
}): PackAnalyticsOutputType["clicks"] {
	const { correct, wrong, expired, pending } = parts;
	const resolvedTotal = correct + wrong + expired;
	const pct = (x: number) =>
		resolvedTotal === 0 ? 0 : Math.round((1000 * x) / resolvedTotal) / 10;
	return {
		correct,
		wrong,
		expired,
		pending,
		resolvedTotal,
		pctCorrectOfResolved: pct(correct),
		pctWrongOfResolved: pct(wrong),
		pctExpiredOfResolved: pct(expired),
	};
}

async function rankedUsersFromUserCounts(
	rows: { user_id: string; cnt: bigint }[],
): Promise<{ username: string; name: string; count: number }[]> {
	if (rows.length === 0) return [];
	const users = await prisma.user.findMany({
		where: { id: { in: rows.map((r) => r.user_id) } },
		select: { id: true, username: true, name: true },
	});
	const byId = new Map(users.map((u) => [u.id, u]));
	return rows.map((r) => {
		const u = byId.get(r.user_id);
		return {
			username: u?.username ?? "?",
			name: u?.name ?? "?",
			count: Number(r.cnt),
		};
	});
}

async function rankedUsersFromHostCounts(
	rows: { host_id: string; cnt: bigint }[],
): Promise<{ username: string; name: string; count: number }[]> {
	if (rows.length === 0) return [];
	const users = await prisma.user.findMany({
		where: { id: { in: rows.map((r) => r.host_id) } },
		select: { id: true, username: true, name: true },
	});
	const byId = new Map(users.map((u) => [u.id, u]));
	return rows.map((r) => {
		const u = byId.get(r.host_id);
		return {
			username: u?.username ?? "?",
			name: u?.name ?? "?",
			count: Number(r.cnt),
		};
	});
}

async function leaderboardsFromUserRows(
	buzzRows: { user_id: string; cnt: bigint }[],
	correctRows: { user_id: string; cnt: bigint }[],
	incorrectRows: { user_id: string; cnt: bigint }[],
	playedRows: { user_id: string; cnt: bigint }[],
): Promise<
	Pick<
		PackAnalyticsOutputType,
		"topBuzzers" | "topCorrectAnswers" | "topIncorrectAnswers" | "topPlayed"
	>
> {
	const [topBuzzers, topCorrectAnswers, topIncorrectAnswers, topPlayed] =
		await Promise.all([
			rankedUsersFromUserCounts(buzzRows),
			rankedUsersFromUserCounts(correctRows),
			rankedUsersFromUserCounts(incorrectRows),
			rankedUsersFromUserCounts(playedRows),
		]);
	return {
		topBuzzers,
		topCorrectAnswers,
		topIncorrectAnswers,
		topPlayed,
	};
}

export async function computePackAnalytics(
	packId: string,
	totalPlays: number,
): Promise<PackAnalyticsOutputType> {
	const completedWhere = { packId, ...COMPLETED_GAME };

	const clickWherePack = { game: { packId } };

	const [
		completedGamesCount,
		hostsDistinctRaw,
		cc,
		cw,
		ce,
		cp,
		bounds,
		hostRows,
		buzzRows,
		correctRows,
		incorrectRows,
		playedRows,
	] = await prisma.$transaction([
		prisma.game.count({ where: completedWhere }),
		prisma.$queryRaw<[{ n: bigint }]>`
			SELECT COUNT(DISTINCT host_id)::bigint AS n
			FROM game
			WHERE pack_id = ${packId}			  AND status = 'completed'
			  AND started_at IS NOT NULL
		`,
		prisma.click.count({
			where: { ...clickWherePack, status: "correct" },
		}),
		prisma.click.count({
			where: { ...clickWherePack, status: "wrong" },
		}),
		prisma.click.count({
			where: { ...clickWherePack, status: "expired" },
		}),
		prisma.click.count({
			where: { ...clickWherePack, status: "pending" },
		}),
		prisma.game.aggregate({
			where: completedWhere,
			_min: { startedAt: true },
			_max: { finishedAt: true },
		}),
		prisma.$queryRaw<{ host_id: string; cnt: bigint }[]>`
			SELECT host_id, COUNT(*)::bigint AS cnt
			FROM game
			WHERE pack_id = ${packId}			  AND status = 'completed'
			  AND started_at IS NOT NULL
			GROUP BY host_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			INNER JOIN game g ON g.id = c.game_id
			WHERE g.pack_id = ${packId}
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			INNER JOIN game g ON g.id = c.game_id
			WHERE g.pack_id = ${packId}
			  AND c.status = 'correct'
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			INNER JOIN game g ON g.id = c.game_id
			WHERE g.pack_id = ${packId}
			  AND c.status = 'wrong'
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(DISTINCT pl.game_id)::bigint AS cnt
			FROM player pl
			INNER JOIN game g ON g.id = pl.game_id
			WHERE g.pack_id = ${packId}
			  AND g.status = 'completed'
			  AND g.started_at IS NOT NULL
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
	]);

	const clicks = clickMixFromCounts({
		correct: cc,
		wrong: cw,
		expired: ce,
		pending: cp,
	});

	const [topHostsByGames, leaderboards] = await Promise.all([
		rankedUsersFromHostCounts(hostRows),
		leaderboardsFromUserRows(buzzRows, correctRows, incorrectRows, playedRows),
	]);

	const hostsDistinct = Number(hostsDistinctRaw[0]?.n ?? 0);

	return {
		completedGamesCount,
		totalPlays,
		clicks,
		hostsDistinct,
		...leaderboards,
		topHostsByGames,
		firstPlayedAt: bounds._min.startedAt,
		lastPlayedAt: bounds._max.finishedAt,
	};
}

export async function computeTopicAnalytics(
	topicId: string,
	topicOrder: number,
): Promise<TopicAnalyticsOutputType> {
	const completedWhere = {
		...COMPLETED_GAME,
		topics: { some: { topicId } },
	};

	const clickWhereTopic = { topicId };

	const [
		completedGamesCount,
		hostsDistinctRaw,
		cc,
		cw,
		ce,
		cp,
		bounds,
		hostRows,
		buzzRows,
		correctRows,
		incorrectRows,
		playedRows,
	] = await prisma.$transaction([
		prisma.game.count({ where: completedWhere }),
		prisma.$queryRaw<[{ n: bigint }]>`
			SELECT COUNT(DISTINCT g.host_id)::bigint AS n
			FROM game g
			INNER JOIN game_topic gt ON gt.game_id = g.id
			WHERE gt.topic_id = ${topicId}			  AND g.status = 'completed'
			  AND g.started_at IS NOT NULL
		`,
		prisma.click.count({
			where: { ...clickWhereTopic, status: "correct" },
		}),
		prisma.click.count({
			where: { ...clickWhereTopic, status: "wrong" },
		}),
		prisma.click.count({
			where: { ...clickWhereTopic, status: "expired" },
		}),
		prisma.click.count({
			where: { ...clickWhereTopic, status: "pending" },
		}),
		prisma.game.aggregate({
			where: completedWhere,
			_min: { startedAt: true },
			_max: { finishedAt: true },
		}),
		prisma.$queryRaw<{ host_id: string; cnt: bigint }[]>`
			SELECT g.host_id, COUNT(*)::bigint AS cnt
			FROM game g
			INNER JOIN game_topic gt ON gt.game_id = g.id
			WHERE gt.topic_id = ${topicId}			  AND g.status = 'completed'
			  AND g.started_at IS NOT NULL
			GROUP BY g.host_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			WHERE c.topic_id = ${topicId}
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			WHERE c.topic_id = ${topicId}
			  AND c.status = 'correct'
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			WHERE c.topic_id = ${topicId}
			  AND c.status = 'wrong'
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(DISTINCT pl.game_id)::bigint AS cnt
			FROM player pl
			INNER JOIN game g ON g.id = pl.game_id
			INNER JOIN game_topic gt ON gt.game_id = g.id AND gt.topic_id = ${topicId}
			WHERE g.status = 'completed'
			  AND g.started_at IS NOT NULL
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
	]);

	const clicks = clickMixFromCounts({
		correct: cc,
		wrong: cw,
		expired: ce,
		pending: cp,
	});

	const [topHostsByGames, leaderboards] = await Promise.all([
		rankedUsersFromHostCounts(hostRows),
		leaderboardsFromUserRows(buzzRows, correctRows, incorrectRows, playedRows),
	]);

	const hostsDistinct = Number(hostsDistinctRaw[0]?.n ?? 0);

	return {
		topicOrder,
		completedGamesCount,
		clicks,
		hostsDistinct,
		...leaderboards,
		topHostsByGames,
		firstPlayedAt: bounds._min.startedAt,
		lastPlayedAt: bounds._max.finishedAt,
	};
}

export async function computeQuestionAnalytics(
	questionId: string,
	questionOrder: number,
): Promise<QuestionAnalyticsOutputType> {
	const completedWhere = {
		...COMPLETED_GAME,
		topics: {
			some: {
				questions: { some: { questionId } },
			},
		},
	};

	const clickWhereQuestion = { questionId };

	const [
		completedGamesCount,
		hostsDistinctRaw,
		cc,
		cw,
		ce,
		cp,
		bounds,
		hostRows,
		buzzRows,
		correctRows,
		incorrectRows,
		playedRows,
	] = await prisma.$transaction([
		prisma.game.count({ where: completedWhere }),
		prisma.$queryRaw<[{ n: bigint }]>`
			SELECT COUNT(DISTINCT g.host_id)::bigint AS n
			FROM game g
			WHERE g.status = 'completed'
			  AND g.started_at IS NOT NULL
			  AND EXISTS (
				SELECT 1 FROM game_topic gt
				INNER JOIN game_question gq ON gq.game_topic_id = gt.id
				WHERE gt.game_id = g.id AND gq.question_id = ${questionId}			  )
		`,
		prisma.click.count({
			where: { ...clickWhereQuestion, status: "correct" },
		}),
		prisma.click.count({
			where: { ...clickWhereQuestion, status: "wrong" },
		}),
		prisma.click.count({
			where: { ...clickWhereQuestion, status: "expired" },
		}),
		prisma.click.count({
			where: { ...clickWhereQuestion, status: "pending" },
		}),
		prisma.game.aggregate({
			where: completedWhere,
			_min: { startedAt: true },
			_max: { finishedAt: true },
		}),
		prisma.$queryRaw<{ host_id: string; cnt: bigint }[]>`
			SELECT g.host_id, COUNT(*)::bigint AS cnt
			FROM game g
			WHERE g.status = 'completed'
			  AND g.started_at IS NOT NULL
			  AND EXISTS (
				SELECT 1 FROM game_topic gt
				INNER JOIN game_question gq ON gq.game_topic_id = gt.id
				WHERE gt.game_id = g.id AND gq.question_id = ${questionId}			  )
			GROUP BY g.host_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			WHERE c.question_id = ${questionId}
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			WHERE c.question_id = ${questionId}
			  AND c.status = 'correct'
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(*)::bigint AS cnt
			FROM click c
			INNER JOIN player pl ON pl.id = c.player_id
			WHERE c.question_id = ${questionId}
			  AND c.status = 'wrong'
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
		prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
			SELECT pl.user_id, COUNT(DISTINCT pl.game_id)::bigint AS cnt
			FROM player pl
			INNER JOIN game g ON g.id = pl.game_id
			WHERE g.status = 'completed'
			  AND g.started_at IS NOT NULL
			  AND EXISTS (
				SELECT 1 FROM game_topic gt
				INNER JOIN game_question gq ON gq.game_topic_id = gt.id
				WHERE gt.game_id = g.id AND gq.question_id = ${questionId}			  )
			GROUP BY pl.user_id
			ORDER BY cnt DESC
			LIMIT 10
		`,
	]);

	const clicks = clickMixFromCounts({
		correct: cc,
		wrong: cw,
		expired: ce,
		pending: cp,
	});

	const [topHostsByGames, leaderboards] = await Promise.all([
		rankedUsersFromHostCounts(hostRows),
		leaderboardsFromUserRows(buzzRows, correctRows, incorrectRows, playedRows),
	]);

	const hostsDistinct = Number(hostsDistinctRaw[0]?.n ?? 0);

	return {
		questionOrder,
		completedGamesCount,
		clicks,
		hostsDistinct,
		...leaderboards,
		topHostsByGames,
		firstPlayedAt: bounds._min.startedAt,
		lastPlayedAt: bounds._max.finishedAt,
	};
}
