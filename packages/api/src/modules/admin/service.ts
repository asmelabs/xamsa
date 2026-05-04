import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	ListAdminBadgesInputType,
	ListAdminBadgesOutputType,
	ListAdminClicksInputType,
	ListAdminClicksOutputType,
	ListAdminCommentsInputType,
	ListAdminCommentsOutputType,
	ListAdminGamesInputType,
	ListAdminGamesOutputType,
	ListAdminPacksInputType,
	ListAdminPacksOutputType,
	ListAdminPostsInputType,
	ListAdminPostsOutputType,
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
	adminCommentSort,
	adminGameSort,
	adminPackSort,
	adminPostSort,
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
	buildAdminCommentsWhere,
	buildAdminGamesWhere,
	buildAdminPacksWhere,
	buildAdminPostsWhere,
	buildAdminQuestionsWhere,
	buildAdminTopicsWhere,
	buildAdminUsersWhere,
} from "./build-where";

const POST_BODY_EXCERPT_LIMIT = 200;
const COMMENT_BODY_EXCERPT_LIMIT = 200;

function truncate(value: string, limit: number): string {
	if (value.length <= limit) return value;
	return `${value.slice(0, limit - 1).trimEnd()}…`;
}

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

	const [rawRows, total] = await prisma.$transaction([
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
				totalPosts: true,
				totalComments: true,
				_count: {
					select: {
						followers: true,
						following: true,
					},
				},
			},
		}),
		prisma.user.count({ where }),
	]);

	const rows = rawRows.map(({ _count, ...rest }) => ({
		...rest,
		totalFollowers: _count.followers,
		totalFollowing: _count.following,
	}));

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

export async function listAdminPosts(
	input: ListAdminPostsInputType,
): Promise<ListAdminPostsOutputType> {
	const { page, limit, sort, dir } = input;
	const p = definePagination(page, limit);
	const orderBy = adminPostSort.resolve(sort, dir);
	const where = buildAdminPostsWhere(input);

	const [rawRows, total] = await prisma.$transaction([
		prisma.post.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				id: true,
				slug: true,
				body: true,
				image: true,
				totalReactions: true,
				totalComments: true,
				createdAt: true,
				author: {
					select: { id: true, username: true, name: true },
				},
				attachment: { select: { id: true } },
			},
		}),
		prisma.post.count({ where }),
	]);

	const rows = rawRows.map((row) => ({
		id: row.id,
		slug: row.slug,
		bodyExcerpt:
			row.body == null ? null : truncate(row.body, POST_BODY_EXCERPT_LIMIT),
		hasImage: row.image != null,
		hasAttachment: row.attachment != null,
		totalReactions: row.totalReactions,
		totalComments: row.totalComments,
		createdAt: row.createdAt,
		author: row.author,
	}));

	return p.output(rows, total);
}

type CommentTargetRowDb = Prisma.CommentGetPayload<{
	select: {
		id: true;
		body: true;
		depth: true;
		totalReactions: true;
		createdAt: true;
		packId: true;
		topicId: true;
		questionId: true;
		postId: true;
		user: { select: { id: true; username: true; name: true } };
	};
}>;

async function buildCommentTargets(
	rows: CommentTargetRowDb[],
): Promise<
	Map<
		string,
		NonNullable<ListAdminCommentsOutputType["items"][number]["target"]>
	>
> {
	const target = new Map<
		string,
		NonNullable<ListAdminCommentsOutputType["items"][number]["target"]>
	>();

	const postIds = new Set<string>();
	const packIds = new Set<string>();
	const topicIds = new Set<string>();
	const questionIds = new Set<string>();

	for (const r of rows) {
		if (r.postId) postIds.add(r.postId);
		else if (r.questionId) questionIds.add(r.questionId);
		else if (r.topicId) topicIds.add(r.topicId);
		else if (r.packId) packIds.add(r.packId);
	}

	const [posts, packs, topics, questions] = await Promise.all([
		postIds.size > 0
			? prisma.post.findMany({
					where: { id: { in: [...postIds] } },
					select: { id: true, slug: true, body: true },
				})
			: Promise.resolve([]),
		packIds.size > 0
			? prisma.pack.findMany({
					where: { id: { in: [...packIds] } },
					select: { id: true, slug: true, name: true },
				})
			: Promise.resolve([]),
		topicIds.size > 0
			? prisma.topic.findMany({
					where: { id: { in: [...topicIds] } },
					select: {
						id: true,
						slug: true,
						name: true,
						pack: { select: { slug: true } },
					},
				})
			: Promise.resolve([]),
		questionIds.size > 0
			? prisma.question.findMany({
					where: { id: { in: [...questionIds] } },
					select: {
						id: true,
						slug: true,
						order: true,
						topic: {
							select: { slug: true, pack: { select: { slug: true } } },
						},
					},
				})
			: Promise.resolve([]),
	]);

	const postById = new Map(posts.map((p) => [p.id, p]));
	const packById = new Map(packs.map((p) => [p.id, p]));
	const topicById = new Map(topics.map((t) => [t.id, t]));
	const questionById = new Map(questions.map((q) => [q.id, q]));

	for (const r of rows) {
		if (r.postId) {
			const p = postById.get(r.postId);
			if (p) {
				target.set(r.id, {
					kind: "post",
					slug: p.slug,
					title: truncate(p.body ?? `Post ${p.slug}`, 80),
				});
			}
			continue;
		}
		if (r.questionId) {
			const q = questionById.get(r.questionId);
			if (q) {
				target.set(r.id, {
					kind: "question",
					packSlug: q.topic.pack.slug,
					topicSlug: q.topic.slug,
					slug: q.slug,
					title: `Question #${q.order}`,
				});
			}
			continue;
		}
		if (r.topicId) {
			const t = topicById.get(r.topicId);
			if (t) {
				target.set(r.id, {
					kind: "topic",
					packSlug: t.pack.slug,
					slug: t.slug,
					title: t.name,
				});
			}
			continue;
		}
		if (r.packId) {
			const p = packById.get(r.packId);
			if (p) {
				target.set(r.id, {
					kind: "pack",
					slug: p.slug,
					title: p.name,
				});
			}
		}
	}

	return target;
}

export async function listAdminComments(
	input: ListAdminCommentsInputType,
): Promise<ListAdminCommentsOutputType> {
	const { page, limit, sort, dir } = input;
	const p = definePagination(page, limit);
	const orderBy = adminCommentSort.resolve(sort, dir);
	const where = buildAdminCommentsWhere(input);

	const [rawRows, total] = await prisma.$transaction([
		prisma.comment.findMany({
			where,
			orderBy,
			...p.use(),
			select: {
				id: true,
				body: true,
				depth: true,
				totalReactions: true,
				createdAt: true,
				packId: true,
				topicId: true,
				questionId: true,
				postId: true,
				user: {
					select: { id: true, username: true, name: true },
				},
			},
		}),
		prisma.comment.count({ where }),
	]);

	const targetMap = await buildCommentTargets(rawRows);

	const rows = rawRows.map((r) => ({
		id: r.id,
		bodyExcerpt: truncate(r.body, COMMENT_BODY_EXCERPT_LIMIT),
		depth: r.depth,
		totalReactions: r.totalReactions,
		createdAt: r.createdAt,
		author: r.user,
		target: targetMap.get(r.id) ?? null,
	}));

	return p.output(rows, total);
}
