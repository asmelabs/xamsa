import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	ListAdminBadgesInputType,
	ListAdminBadgesOutputType,
	ListAdminClicksInputType,
	ListAdminClicksOutputType,
	ListAdminGamesInputType,
	ListAdminGamesOutputType,
	ListAdminPacksInputType,
	ListAdminPacksOutputType,
	ListAdminQuestionsInputType,
	ListAdminQuestionsOutputType,
	ListAdminTopicBulkJobsInputType,
	ListAdminTopicBulkJobsOutputType,
	ListAdminTopicsInputType,
	ListAdminTopicsOutputType,
	ListAdminUsersInputType,
	ListAdminUsersOutputType,
} from "@xamsa/schemas/modules/admin";
import {
	adminClickSort,
	adminGameSort,
	adminPackSort,
	adminQuestionSort,
	adminTopicBulkJobPeriod,
	adminTopicBulkJobSearch,
	adminTopicBulkJobSort,
	adminTopicSort,
	adminUserSort,
} from "@xamsa/schemas/modules/listings/admin";
import { ALL_BADGE_IDS, getBadge } from "@xamsa/utils/badges";
import { definePagination } from "@xamsa/utils/pagination";
import {
	buildAdminClicksWhere,
	buildAdminGamesWhere,
	buildAdminPacksWhere,
	buildAdminQuestionsWhere,
	buildAdminTopicsWhere,
	buildAdminUsersWhere,
} from "./build-where";

export async function listAdminPacks(
	input: ListAdminPacksInputType,
): Promise<ListAdminPacksOutputType> {
	const { page, limit, sort, dir } = input;
	const p = definePagination(page, limit);
	const orderBy = adminPackSort.resolve(sort, dir);
	const where = buildAdminPacksWhere(input);

	const [rows, total] = await prisma.$transaction([
		prisma.pack.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				slug: true,
				name: true,
				description: true,
				status: true,
				visibility: true,
				language: true,
				createdAt: true,
				updatedAt: true,
				publishedAt: true,
				totalPlays: true,
				averageRating: true,
				pdr: true,
				author: {
					select: { id: true, username: true, name: true },
				},
				_count: { select: { topics: true } },
			},
		}),
		prisma.pack.count({ where }),
	]);

	return p.output(rows, total);
}

export async function listAdminUsers(
	input: ListAdminUsersInputType,
): Promise<ListAdminUsersOutputType> {
	const { page, limit, sort, dir } = input;
	const p = definePagination(page, limit);
	const orderBy = adminUserSort.resolve(sort, dir);
	const where = buildAdminUsersWhere(input);

	const [rows, total] = await prisma.$transaction([
		prisma.user.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				id: true,
				username: true,
				email: true,
				name: true,
				image: true,
				role: true,
				emailVerified: true,
				createdAt: true,
				xp: true,
				level: true,
				elo: true,
				totalGamesHosted: true,
				totalGamesPlayed: true,
				totalPacksPublished: true,
				totalFollowers: true,
				totalFollowing: true,
			},
		}),
		prisma.user.count({ where }),
	]);

	return p.output(rows, total);
}

export async function listAdminGames(
	input: ListAdminGamesInputType,
): Promise<ListAdminGamesOutputType> {
	const { page, limit, sort, dir } = input;
	const p = definePagination(page, limit);
	const orderBy = adminGameSort.resolve(sort, dir);
	const where = buildAdminGamesWhere(input);

	const [rows, total] = await prisma.$transaction([
		prisma.game.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				id: true,
				code: true,
				status: true,
				createdAt: true,
				updatedAt: true,
				startedAt: true,
				finishedAt: true,
				totalActivePlayers: true,
				totalTopics: true,
				totalQuestions: true,
				durationSeconds: true,
				host: { select: { id: true, username: true, name: true } },
				pack: { select: { slug: true, name: true } },
			},
		}),
		prisma.game.count({ where }),
	]);

	return p.output(rows, total);
}

export async function listAdminTopics(
	input: ListAdminTopicsInputType,
): Promise<ListAdminTopicsOutputType> {
	const { page, limit, sort, dir } = input;
	const p = definePagination(page, limit);
	const orderBy = adminTopicSort.resolve(sort, dir);
	const where = buildAdminTopicsWhere(input);

	const [rows, total] = await prisma.$transaction([
		prisma.topic.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				id: true,
				slug: true,
				name: true,
				description: true,
				order: true,
				tdr: true,
				createdAt: true,
				updatedAt: true,
				_count: { select: { questions: true } },
				pack: {
					select: {
						slug: true,
						name: true,
						status: true,
						author: { select: { username: true, name: true } },
					},
				},
			},
		}),
		prisma.topic.count({ where }),
	]);

	return p.output(rows, total);
}

const QUESTION_TEXT_LENGTH_MAX_SCAN = 10_000;

const questionListSelect = {
	id: true,
	slug: true,
	text: true,
	description: true,
	order: true,
	qdr: true,
	createdAt: true,
	updatedAt: true,
	topic: {
		select: {
			slug: true,
			name: true,
			order: true,
			pack: { select: { slug: true, name: true } },
		},
	},
} as const;

export async function listAdminQuestions(
	input: ListAdminQuestionsInputType,
): Promise<ListAdminQuestionsOutputType> {
	const { page, limit, sort, dir } = input;
	const p = definePagination(page, limit);
	const where = buildAdminQuestionsWhere(input);
	const { skip, take } = p.use();

	if (sort === "text_length") {
		const total = await prisma.question.count({ where });
		if (total > QUESTION_TEXT_LENGTH_MAX_SCAN) {
			throw new ORPCError("BAD_REQUEST", {
				message: `At most ${QUESTION_TEXT_LENGTH_MAX_SCAN} questions can be sorted by text length. Add filters to narrow the set (currently ${total} matches).`,
			});
		}
		const all = await prisma.question.findMany({
			where,
			select: questionListSelect,
		});
		const dirSign = dir === "asc" ? 1 : -1;
		all.sort((a, b) => dirSign * (a.text.length - b.text.length));
		const rows = all.slice(skip, skip + take);
		return p.output(rows, total);
	}

	const orderBy = adminQuestionSort.resolve(sort, dir);
	const [rows, total] = await prisma.$transaction([
		prisma.question.findMany({
			where,
			orderBy,
			...p.use(),
			select: questionListSelect,
		}),
		prisma.question.count({ where }),
	]);

	return p.output(rows, total);
}

export async function listAdminClicks(
	input: ListAdminClicksInputType,
): Promise<ListAdminClicksOutputType> {
	const { page, limit, sort, dir } = input;
	const p = definePagination(page, limit);
	const orderBy = adminClickSort.resolve(sort, dir);
	const where = buildAdminClicksWhere(input);

	const [rows, total] = await prisma.$transaction([
		prisma.click.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				id: true,
				createdAt: true,
				updatedAt: true,
				clickedAt: true,
				answeredAt: true,
				status: true,
				position: true,
				reactionMs: true,
				pointsAwarded: true,
				game: {
					select: {
						id: true,
						code: true,
						status: true,
					},
				},
				player: {
					select: {
						id: true,
						score: true,
						user: {
							select: { id: true, username: true, name: true },
						},
					},
				},
				question: {
					select: { id: true, slug: true, order: true, text: true },
				},
				topic: {
					select: { slug: true, name: true, order: true },
				},
			},
		}),
		prisma.click.count({ where }),
	]);

	return p.output(rows, total);
}

export async function listAdminTopicBulkJobs(
	input: ListAdminTopicBulkJobsInputType,
): Promise<ListAdminTopicBulkJobsOutputType> {
	const { page, limit, sort, dir, query, from, to, statuses } = input;
	const p = definePagination(page, limit);
	const orderBy = adminTopicBulkJobSort.resolve(sort, dir);
	const searchWhere = adminTopicBulkJobSearch.resolve(query);
	const periodWhere = adminTopicBulkJobPeriod.resolve(from, to);

	const where: Prisma.TopicBulkJobWhereInput = {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(statuses?.length ? [{ status: { in: statuses } }] : []),
		],
	};

	const [rows, total] = await prisma.$transaction([
		prisma.topicBulkJob.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				id: true,
				createdAt: true,
				updatedAt: true,
				packSlug: true,
				status: true,
				totalTopics: true,
				errorMessage: true,
				user: {
					select: {
						id: true,
						username: true,
						email: true,
						name: true,
					},
				},
			},
		}),
		prisma.topicBulkJob.count({ where }),
	]);

	return p.output(rows, total);
}

export async function listAdminBadges(
	input: ListAdminBadgesInputType,
): Promise<ListAdminBadgesOutputType> {
	const {
		page,
		limit,
		sort,
		dir,
		query,
		periods,
		types,
		categories,
		minTotalAwards,
		maxTotalAwards,
		minEarners,
		maxEarners,
	} = input;

	const aggRows = await prisma.$queryRaw<
		Array<{ badge_id: string; total_awards: bigint; distinct_earners: bigint }>
	>`
    SELECT pba.badge_id AS badge_id,
           COUNT(*)::bigint AS total_awards,
           COUNT(DISTINCT p.user_id)::bigint AS distinct_earners
    FROM player_badge_award pba
    INNER JOIN player p ON p.id = pba.player_id
    GROUP BY pba.badge_id
  `;

	const agg = new Map<
		string,
		{ totalAwards: number; distinctEarners: number }
	>();
	for (const row of aggRows) {
		agg.set(row.badge_id, {
			totalAwards: Number(row.total_awards),
			distinctEarners: Number(row.distinct_earners),
		});
	}

	const qlow = query?.trim().toLowerCase();

	let rows = ALL_BADGE_IDS.map((id) => {
		const meta = getBadge(id);
		const a = agg.get(id) ?? { totalAwards: 0, distinctEarners: 0 };
		return {
			badgeId: id,
			name: meta.name,
			period: meta.period,
			type: meta.type,
			category: meta.category,
			totalAwards: a.totalAwards,
			distinctEarners: a.distinctEarners,
		};
	});

	if (qlow) {
		rows = rows.filter(
			(r) =>
				r.badgeId.toLowerCase().includes(qlow) ||
				r.name.toLowerCase().includes(qlow),
		);
	}
	if (periods?.length) {
		rows = rows.filter((r) => periods.includes(r.period));
	}
	if (types?.length) {
		rows = rows.filter((r) => types.includes(r.type));
	}
	if (categories?.length) {
		rows = rows.filter((r) => categories.includes(r.category));
	}
	if (minTotalAwards != null) {
		rows = rows.filter((r) => r.totalAwards >= minTotalAwards);
	}
	if (maxTotalAwards != null) {
		rows = rows.filter((r) => r.totalAwards <= maxTotalAwards);
	}
	if (minEarners != null) {
		rows = rows.filter((r) => r.distinctEarners >= minEarners);
	}
	if (maxEarners != null) {
		rows = rows.filter((r) => r.distinctEarners <= maxEarners);
	}

	const mult = dir === "asc" ? 1 : -1;
	const sorted = [...rows].sort((a, b) => {
		switch (sort) {
			case "name":
				return mult * a.name.localeCompare(b.name);
			case "badge_id":
				return mult * a.badgeId.localeCompare(b.badgeId);
			case "total_awards":
				return mult * (a.totalAwards - b.totalAwards);
			case "distinct_earners":
				return mult * (a.distinctEarners - b.distinctEarners);
			default:
				return 0;
		}
	});

	const p = definePagination(page, limit);
	const total = sorted.length;
	const { skip, take } = p.use();
	const slice = sorted.slice(skip, skip + take);

	return p.output(slice, total);
}
