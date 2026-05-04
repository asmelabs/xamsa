import type { Prisma } from "@xamsa/db";
import type {
	ListAdminClicksInputType,
	ListAdminCommentsInputType,
	ListAdminGamesInputType,
	ListAdminPacksInputType,
	ListAdminPostsInputType,
	ListAdminQuestionsInputType,
	ListAdminTopicsInputType,
	ListAdminUsersInputType,
} from "@xamsa/schemas/modules/admin";
import {
	adminClickPeriod,
	adminClickSearch,
	adminCommentPeriod,
	adminCommentSearch,
	adminGamePeriod,
	adminGameSearch,
	adminPackPeriod,
	adminPackSearch,
	adminPostPeriod,
	adminPostSearch,
	adminQuestionPeriod,
	adminQuestionSearch,
	adminTopicPeriod,
	adminTopicSearch,
	adminUserPeriod,
	adminUserSearch,
} from "@xamsa/schemas/modules/listings/admin";

export function buildAdminPacksWhere(
	input: ListAdminPacksInputType,
): Prisma.PackWhereInput {
	const {
		query,
		from,
		to,
		statuses,
		visibilities,
		languages,
		authorUsernames,
		minRating,
		maxRating,
		minPlay,
		maxPlay,
		hasRating,
		minPdr,
		maxPdr,
	} = input;
	const searchWhere = adminPackSearch.resolve(query);
	const periodWhere = adminPackPeriod.resolve(from, to);

	return {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			{
				...(statuses?.length ? { status: { in: statuses } } : {}),
				...(visibilities?.length ? { visibility: { in: visibilities } } : {}),
				...(languages?.length ? { language: { in: languages } } : {}),
				...(authorUsernames?.length
					? { author: { username: { in: authorUsernames } } }
					: {}),
				...(minRating != null || maxRating != null
					? {
							averageRating: {
								...(minRating != null ? { gte: minRating } : {}),
								...(maxRating != null ? { lte: maxRating } : {}),
							},
						}
					: {}),
				...(minPlay != null || maxPlay != null
					? {
							totalPlays: {
								...(minPlay != null ? { gte: minPlay } : {}),
								...(maxPlay != null ? { lte: maxPlay } : {}),
							},
						}
					: {}),
				...(hasRating === true ? { totalRatings: { gt: 0 } } : {}),
				...(minPdr != null || maxPdr != null
					? {
							pdr: {
								...(minPdr != null ? { gte: minPdr } : {}),
								...(maxPdr != null ? { lte: maxPdr } : {}),
							},
						}
					: {}),
			},
		],
	};
}

export function buildAdminUsersWhere(
	input: ListAdminUsersInputType,
): Prisma.UserWhereInput {
	const {
		query,
		from,
		to,
		roles,
		minXp,
		maxXp,
		minElo,
		maxElo,
		minHosted,
		maxHosted,
		minPlayed,
		maxPlayed,
		minPacks,
		maxPacks,
	} = input;
	const searchWhere = adminUserSearch.resolve(query);
	const periodWhere = adminUserPeriod.resolve(from, to);

	return {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(roles?.length ? [{ role: { in: roles } }] : []),
			{
				...(minXp != null || maxXp != null
					? {
							xp: {
								...(minXp != null ? { gte: minXp } : {}),
								...(maxXp != null ? { lte: maxXp } : {}),
							},
						}
					: {}),
				...(minElo != null || maxElo != null
					? {
							elo: {
								...(minElo != null ? { gte: minElo } : {}),
								...(maxElo != null ? { lte: maxElo } : {}),
							},
						}
					: {}),
				...(minHosted != null || maxHosted != null
					? {
							totalGamesHosted: {
								...(minHosted != null ? { gte: minHosted } : {}),
								...(maxHosted != null ? { lte: maxHosted } : {}),
							},
						}
					: {}),
				...(minPlayed != null || maxPlayed != null
					? {
							totalGamesPlayed: {
								...(minPlayed != null ? { gte: minPlayed } : {}),
								...(maxPlayed != null ? { lte: maxPlayed } : {}),
							},
						}
					: {}),
				...(minPacks != null || maxPacks != null
					? {
							totalPacksPublished: {
								...(minPacks != null ? { gte: minPacks } : {}),
								...(maxPacks != null ? { lte: maxPacks } : {}),
							},
						}
					: {}),
			},
		],
	};
}

export function buildAdminGamesWhere(
	input: ListAdminGamesInputType,
): Prisma.GameWhereInput {
	const {
		query,
		from,
		to,
		statuses,
		packSlugs,
		hostUsernames,
		minPlayers,
		maxPlayers,
		minTopics,
		maxTopics,
		minQuestions,
		maxQuestions,
	} = input;
	const searchWhere = adminGameSearch.resolve(query);
	const periodWhere = adminGamePeriod.resolve(from, to);

	return {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(statuses?.length ? [{ status: { in: statuses } }] : []),
			{
				...(packSlugs?.length ? { pack: { slug: { in: packSlugs } } } : {}),
				...(hostUsernames?.length
					? { host: { username: { in: hostUsernames } } }
					: {}),
				...(minPlayers != null || maxPlayers != null
					? {
							totalActivePlayers: {
								...(minPlayers != null ? { gte: minPlayers } : {}),
								...(maxPlayers != null ? { lte: maxPlayers } : {}),
							},
						}
					: {}),
				...(minTopics != null || maxTopics != null
					? {
							totalTopics: {
								...(minTopics != null ? { gte: minTopics } : {}),
								...(maxTopics != null ? { lte: maxTopics } : {}),
							},
						}
					: {}),
				...(minQuestions != null || maxQuestions != null
					? {
							totalQuestions: {
								...(minQuestions != null ? { gte: minQuestions } : {}),
								...(maxQuestions != null ? { lte: maxQuestions } : {}),
							},
						}
					: {}),
			},
		],
	};
}

export function buildAdminTopicsWhere(
	input: ListAdminTopicsInputType,
): Prisma.TopicWhereInput {
	const { query, from, to, packSlugs, authorUsernames, minTdr, maxTdr } = input;
	const searchWhere = adminTopicSearch.resolve(query);
	const periodWhere = adminTopicPeriod.resolve(from, to);

	return {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(packSlugs?.length ? [{ pack: { slug: { in: packSlugs } } }] : []),
			...(authorUsernames?.length
				? [
						{
							pack: { author: { username: { in: authorUsernames } } },
						},
					]
				: []),
			...(minTdr != null || maxTdr != null
				? [
						{
							tdr: {
								...(minTdr != null ? { gte: minTdr } : {}),
								...(maxTdr != null ? { lte: maxTdr } : {}),
							},
						},
					]
				: []),
		],
	};
}

export function buildAdminQuestionsWhere(
	input: ListAdminQuestionsInputType,
): Prisma.QuestionWhereInput {
	const {
		query,
		from,
		to,
		packSlugs,
		topicSlugs,
		authorUsernames,
		minQdr,
		maxQdr,
	} = input;
	const searchWhere = adminQuestionSearch.resolve(query);
	const periodWhere = adminQuestionPeriod.resolve(from, to);

	return {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(packSlugs?.length
				? [{ topic: { pack: { slug: { in: packSlugs } } } }]
				: []),
			...(topicSlugs?.length ? [{ topic: { slug: { in: topicSlugs } } }] : []),
			...(authorUsernames?.length
				? [
						{
							topic: {
								pack: {
									author: { username: { in: authorUsernames } },
								},
							},
						},
					]
				: []),
			...(minQdr != null || maxQdr != null
				? [
						{
							qdr: {
								...(minQdr != null ? { gte: minQdr } : {}),
								...(maxQdr != null ? { lte: maxQdr } : {}),
							},
						},
					]
				: []),
		],
	};
}

export function buildAdminClicksWhere(
	input: ListAdminClicksInputType,
): Prisma.ClickWhereInput {
	const {
		query,
		from,
		to,
		statuses,
		playerUsernames,
		gameCodes,
		questionSlugs,
		topicSlugs,
		packSlugs,
		minPoints,
		maxPoints,
		minPos,
		maxPos,
		minMs,
		maxMs,
	} = input;
	const searchWhere = adminClickSearch.resolve(query);
	const periodWhere = adminClickPeriod.resolve(from, to);

	const pointsFilter: Prisma.IntFilter | undefined =
		minPoints != null || maxPoints != null
			? {
					...(minPoints != null ? { gte: minPoints } : {}),
					...(maxPoints != null ? { lte: maxPoints } : {}),
				}
			: undefined;
	const posFilter: Prisma.IntFilter | undefined =
		minPos != null || maxPos != null
			? {
					...(minPos != null ? { gte: minPos } : {}),
					...(maxPos != null ? { lte: maxPos } : {}),
				}
			: undefined;

	const reactionFilter: Prisma.IntNullableFilter | undefined =
		minMs != null || maxMs != null
			? {
					not: null,
					...(minMs != null ? { gte: minMs } : {}),
					...(maxMs != null ? { lte: maxMs } : {}),
				}
			: undefined;

	return {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(statuses?.length ? [{ status: { in: statuses } }] : []),
			{
				...(playerUsernames?.length
					? { player: { user: { username: { in: playerUsernames } } } }
					: {}),
				...(gameCodes?.length ? { game: { code: { in: gameCodes } } } : {}),
				...(questionSlugs?.length
					? { question: { slug: { in: questionSlugs } } }
					: {}),
				...(topicSlugs?.length ? { topic: { slug: { in: topicSlugs } } } : {}),
				...(packSlugs?.length
					? { game: { pack: { slug: { in: packSlugs } } } }
					: {}),
				...(pointsFilter ? { pointsAwarded: pointsFilter } : {}),
				...(posFilter ? { position: posFilter } : {}),
				...(reactionFilter ? { reactionMs: reactionFilter } : {}),
			},
		],
	};
}

export function buildAdminPostsWhere(
	input: ListAdminPostsInputType,
): Prisma.PostWhereInput {
	const {
		query,
		from,
		to,
		authorUsernames,
		hasImage,
		hasAttachment,
		minReactions,
		maxReactions,
		minComments,
		maxComments,
	} = input;
	const searchWhere = adminPostSearch.resolve(query);
	const periodWhere = adminPostPeriod.resolve(from, to);

	return {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(authorUsernames?.length
				? [{ author: { username: { in: authorUsernames } } }]
				: []),
			...(hasImage === true ? [{ image: { not: null } }] : []),
			...(hasImage === false ? [{ image: null }] : []),
			...(hasAttachment === true ? [{ attachment: { isNot: null } }] : []),
			...(hasAttachment === false ? [{ attachment: { is: null } }] : []),
			...(minReactions != null || maxReactions != null
				? [
						{
							totalReactions: {
								...(minReactions != null ? { gte: minReactions } : {}),
								...(maxReactions != null ? { lte: maxReactions } : {}),
							},
						},
					]
				: []),
			...(minComments != null || maxComments != null
				? [
						{
							totalComments: {
								...(minComments != null ? { gte: minComments } : {}),
								...(maxComments != null ? { lte: maxComments } : {}),
							},
						},
					]
				: []),
		],
	};
}

export function buildAdminCommentsWhere(
	input: ListAdminCommentsInputType,
): Prisma.CommentWhereInput {
	const {
		query,
		from,
		to,
		authorUsernames,
		targetKinds,
		minReactions,
		maxReactions,
		minDepth,
		maxDepth,
	} = input;
	const searchWhere = adminCommentSearch.resolve(query);
	const periodWhere = adminCommentPeriod.resolve(from, to);

	const targetClause = targetKinds?.length
		? {
				OR: targetKinds.map((kind) => {
					switch (kind) {
						case "post":
							return { postId: { not: null } };
						case "pack":
							return {
								AND: [
									{ packId: { not: null } },
									{ topicId: null },
									{ questionId: null },
									{ postId: null },
								],
							};
						case "topic":
							return {
								AND: [
									{ topicId: { not: null } },
									{ questionId: null },
									{ postId: null },
								],
							};
						case "question":
							return {
								AND: [{ questionId: { not: null } }, { postId: null }],
							};
						default:
							throw new Error(`Unknown target kind: ${kind}`);
					}
				}),
			}
		: null;

	return {
		AND: [
			searchWhere ?? {},
			periodWhere ?? {},
			...(authorUsernames?.length
				? [{ user: { username: { in: authorUsernames } } }]
				: []),
			targetClause ?? {},
			...(minReactions != null || maxReactions != null
				? [
						{
							totalReactions: {
								...(minReactions != null ? { gte: minReactions } : {}),
								...(maxReactions != null ? { lte: maxReactions } : {}),
							},
						},
					]
				: []),
			...(minDepth != null || maxDepth != null
				? [
						{
							depth: {
								...(minDepth != null ? { gte: minDepth } : {}),
								...(maxDepth != null ? { lte: maxDepth } : {}),
							},
						},
					]
				: []),
		],
	};
}
