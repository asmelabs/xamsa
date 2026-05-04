import type { Prisma } from "@xamsa/db";
import z from "zod";
import { definePeriod } from "../../common/period.schema";
import { defineSearch } from "../../common/search.schema";
import { defineSorting } from "../../common/sorting";

/** Admin: paginated pack list (staff only) */
export const adminPackSort =
	defineSorting<Prisma.PackOrderByWithRelationInput>()({
		values: {
			newest: { createdAt: "desc" },
			oldest: { createdAt: "asc" },
			name: { name: "asc" },
			slug: { slug: "asc" },
			most_topics: { topics: { _count: "desc" } },
			rating: { averageRating: "desc" },
			plays: { totalPlays: "desc" },
			pdr: { pdr: "desc" },
		},
		default: "newest",
	});

export const adminPackSearch = defineSearch<Prisma.PackWhereInput>([
	"name",
	"description",
	"slug",
	"author.username",
	"author.name",
]);

export const adminPackPeriod = definePeriod<Prisma.PackWhereInput>("createdAt");

/** Admin: user list */
export const adminUserSort =
	defineSorting<Prisma.UserOrderByWithRelationInput>()({
		values: {
			newest: { createdAt: "desc" },
			oldest: { createdAt: "asc" },
			username: { username: "asc" },
			email: { email: "asc" },
			xp: { xp: "desc" },
			elo: { elo: "desc" },
			packs: { totalPacksPublished: "desc" },
			posts: { totalPosts: "desc" },
			comments: { totalComments: "desc" },
			followers: { followers: { _count: "desc" } },
			following: { following: { _count: "desc" } },
		},
		default: "newest",
	});

export const adminUserSearch = defineSearch<Prisma.UserWhereInput>([
	"username",
	"email",
	"name",
]);

export const adminUserPeriod = definePeriod<Prisma.UserWhereInput>("createdAt");

/** Admin: game list */
export const adminGameSort =
	defineSorting<Prisma.GameOrderByWithRelationInput>()({
		values: {
			newest: { createdAt: "desc" },
			oldest: { createdAt: "asc" },
			started: { startedAt: "desc" },
			finished: { finishedAt: "desc" },
			code: { code: "asc" },
			status: { status: "asc" },
			players: { totalActivePlayers: "desc" },
			topics: { totalTopics: "desc" },
			questions: { totalQuestions: "desc" },
		},
		default: "newest",
	});

export const adminGameSearch = defineSearch<Prisma.GameWhereInput>([
	"code",
	"pack.name",
	"host.username",
	"host.name",
]);

export const adminGamePeriod = definePeriod<Prisma.GameWhereInput>("createdAt");

/** Admin: topic list */
export const adminTopicSort =
	defineSorting<Prisma.TopicOrderByWithRelationInput>()({
		values: {
			order: { order: "asc" },
			newest: { createdAt: "desc" },
			name: { name: "asc" },
			pack_name: { pack: { name: "asc" } },
		},
		default: "newest",
	});

export const adminTopicSearch = defineSearch<Prisma.TopicWhereInput>([
	"name",
	"description",
	"slug",
	"pack.name",
	"pack.slug",
]);

export const adminTopicPeriod =
	definePeriod<Prisma.TopicWhereInput>("createdAt");

/** Admin: question list — `text_length` is ordered via raw SQL in the service (not Prisma `orderBy`). */
export const adminQuestionSort =
	defineSorting<Prisma.QuestionOrderByWithRelationInput>()({
		values: {
			newest: { createdAt: "desc" },
			order: { order: "asc" },
			topic_order: { topic: { order: "asc" } },
			/** Placeholder: service branches to char_length(text) sort */
			text_length: { id: "asc" },
			qdr: { qdr: "desc" },
		},
		default: "newest",
	});

export const adminQuestionSearch = defineSearch<Prisma.QuestionWhereInput>([
	"text",
	"slug",
	"topic.name",
	"topic.pack.name",
	"topic.pack.slug",
]);

export const adminQuestionPeriod =
	definePeriod<Prisma.QuestionWhereInput>("createdAt");

/** Admin: click list */
export const adminClickSort =
	defineSorting<Prisma.ClickOrderByWithRelationInput>()({
		values: {
			newest: { clickedAt: "desc" },
			oldest: { clickedAt: "asc" },
			created: { createdAt: "desc" },
			reaction: { reactionMs: "asc" },
			position: { position: "asc" },
			points: { pointsAwarded: "desc" },
			ms: { reactionMs: "asc" },
		},
		default: "newest",
	});

export const adminClickSearch = defineSearch<Prisma.ClickWhereInput>([
	"game.code",
	"player.user.username",
	"player.user.name",
]);

export const adminClickPeriod =
	definePeriod<Prisma.ClickWhereInput>("clickedAt");

/** Admin: post list */
export const adminPostSort =
	defineSorting<Prisma.PostOrderByWithRelationInput>()({
		values: {
			newest: { createdAt: "desc" },
			oldest: { createdAt: "asc" },
			reactions: { totalReactions: "desc" },
			comments: { totalComments: "desc" },
		},
		default: "newest",
	});

export const adminPostSearch = defineSearch<Prisma.PostWhereInput>([
	"body",
	"slug",
	"author.username",
	"author.name",
]);

export const adminPostPeriod = definePeriod<Prisma.PostWhereInput>("createdAt");

/** Admin: comment list */
export const adminCommentSort =
	defineSorting<Prisma.CommentOrderByWithRelationInput>()({
		values: {
			newest: { createdAt: "desc" },
			oldest: { createdAt: "asc" },
			reactions: { totalReactions: "desc" },
		},
		default: "newest",
	});

export const adminCommentSearch = defineSearch<Prisma.CommentWhereInput>([
	"body",
	"user.username",
	"user.name",
]);

export const adminCommentPeriod =
	definePeriod<Prisma.CommentWhereInput>("createdAt");

/** Admin: topic bulk job list */
export const adminTopicBulkJobSort =
	defineSorting<Prisma.TopicBulkJobOrderByWithRelationInput>()({
		values: {
			newest: { createdAt: "desc" },
			updated: { updatedAt: "desc" },
			status: { status: "asc" },
			pack: { packSlug: "asc" },
		},
		default: "newest",
	});

export const adminTopicBulkJobSearch =
	defineSearch<Prisma.TopicBulkJobWhereInput>([
		"packSlug",
		"user.username",
		"user.email",
	]);

export const adminTopicBulkJobPeriod =
	definePeriod<Prisma.TopicBulkJobWhereInput>("createdAt");

/** Admin: badge catalog stats — sort applied in memory after aggregation */
export const adminBadgeSort = {
	options: ["name", "badge_id", "total_awards", "distinct_earners"] as const,
	defaultOption: "total_awards" as const,
	shape: () => ({
		sort: z
			.enum(["name", "badge_id", "total_awards", "distinct_earners"])
			.default("total_awards"),
		dir: z.enum(["asc", "desc"]).optional(),
	}),
};
