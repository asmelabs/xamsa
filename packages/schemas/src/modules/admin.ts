import z from "zod";
import {
	PaginationInputSchema,
	PaginationOutputSchema,
} from "../common/pagination";
import { ClickStatusSchema } from "../db/schemas/enums/ClickStatus.schema";
import { GameStatusSchema } from "../db/schemas/enums/GameStatus.schema";
import { PackLanguageSchema } from "../db/schemas/enums/PackLanguage.schema";
import { PackStatusSchema } from "../db/schemas/enums/PackStatus.schema";
import { PackVisibilitySchema } from "../db/schemas/enums/PackVisibility.schema";
import { RoleSchema } from "../db/schemas/enums/Role.schema";
import { TopicBulkJobStatusSchema } from "../db/schemas/enums/TopicBulkJobStatus.schema";
import { UserSchema } from "../db/schemas/models/User.schema";
import {
	adminClickPeriod,
	adminClickSearch,
	adminClickSort,
	adminGamePeriod,
	adminGameSearch,
	adminGameSort,
	adminPackPeriod,
	adminPackSearch,
	adminPackSort,
	adminQuestionPeriod,
	adminQuestionSearch,
	adminQuestionSort,
	adminTopicBulkJobPeriod,
	adminTopicBulkJobSearch,
	adminTopicBulkJobSort,
	adminTopicPeriod,
	adminTopicSearch,
	adminTopicSort,
	adminUserPeriod,
	adminUserSearch,
	adminUserSort,
} from "./listings/admin";

// --- Packs ---

export const ListAdminPacksFiltersSchema = z.object({
	statuses: z.array(PackStatusSchema),
	visibilities: z.array(PackVisibilitySchema),
	languages: z.array(PackLanguageSchema),
	authorUsernames: z.array(z.string().min(1)),
	minRating: z.number(),
	maxRating: z.number(),
	minPlay: z.int(),
	maxPlay: z.int(),
	hasRating: z.boolean(),
});

export const ListAdminPacksInputSchema = ListAdminPacksFiltersSchema.partial()
	.extend(PaginationInputSchema.shape)
	.extend(adminPackSort.shape())
	.extend(adminPackSearch.shape())
	.extend(adminPackPeriod.shape());

export const ListAdminPacksItemSchema = z.object({
	slug: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	status: PackStatusSchema,
	visibility: PackVisibilitySchema,
	language: PackLanguageSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	publishedAt: z.coerce.date().nullable(),
	totalPlays: z.number().int(),
	averageRating: z.number(),
	author: z.object({
		id: z.string(),
		username: z.string(),
		name: z.string(),
	}),
	_count: z.object({ topics: z.number().int() }),
});

export const ListAdminPacksOutputSchema = PaginationOutputSchema(
	ListAdminPacksItemSchema,
);

export type ListAdminPacksInputType = z.infer<typeof ListAdminPacksInputSchema>;
export type ListAdminPacksOutputType = z.infer<
	typeof ListAdminPacksOutputSchema
>;

// --- Users ---

export const ListAdminUsersFiltersSchema = z.object({
	roles: z.array(RoleSchema),
	minXp: z.int(),
	maxXp: z.int(),
	minElo: z.int(),
	maxElo: z.int(),
	minHosted: z.int(),
	maxHosted: z.int(),
	minPlayed: z.int(),
	maxPlayed: z.int(),
	minPacks: z.int(),
	maxPacks: z.int(),
});

export const ListAdminUsersInputSchema = ListAdminUsersFiltersSchema.partial()
	.extend(PaginationInputSchema.shape)
	.extend(adminUserSort.shape())
	.extend(adminUserSearch.shape())
	.extend(adminUserPeriod.shape());

export const ListAdminUsersItemSchema = UserSchema.pick({
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
});

export const ListAdminUsersOutputSchema = PaginationOutputSchema(
	ListAdminUsersItemSchema,
);

export type ListAdminUsersInputType = z.infer<typeof ListAdminUsersInputSchema>;
export type ListAdminUsersOutputType = z.infer<
	typeof ListAdminUsersOutputSchema
>;

// --- Games ---

export const ListAdminGamesFiltersSchema = z.object({
	statuses: z.array(GameStatusSchema),
	packSlugs: z.array(z.string().min(1)),
	hostUsernames: z.array(z.string().min(1)),
	minPlayers: z.int(),
	maxPlayers: z.int(),
	minTopics: z.int(),
	maxTopics: z.int(),
	minQuestions: z.int(),
	maxQuestions: z.int(),
});

export const ListAdminGamesInputSchema = ListAdminGamesFiltersSchema.partial()
	.extend(PaginationInputSchema.shape)
	.extend(adminGameSort.shape())
	.extend(adminGameSearch.shape())
	.extend(adminGamePeriod.shape());

export const ListAdminGamesItemSchema = z.object({
	id: z.string(),
	code: z.string(),
	status: GameStatusSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	startedAt: z.coerce.date().nullable(),
	finishedAt: z.coerce.date().nullable(),
	totalActivePlayers: z.number().int(),
	totalTopics: z.number().int(),
	totalQuestions: z.number().int(),
	durationSeconds: z.number().int().nullable(),
	host: z.object({
		id: z.string(),
		username: z.string(),
		name: z.string(),
	}),
	pack: z.object({
		slug: z.string(),
		name: z.string(),
	}),
});

export const ListAdminGamesOutputSchema = PaginationOutputSchema(
	ListAdminGamesItemSchema,
);

export type ListAdminGamesInputType = z.infer<typeof ListAdminGamesInputSchema>;
export type ListAdminGamesOutputType = z.infer<
	typeof ListAdminGamesOutputSchema
>;

// --- Topics ---

export const ListAdminTopicsFiltersSchema = z.object({
	packSlugs: z.array(z.string()),
	authorUsernames: z.array(z.string().min(1)),
});

export const ListAdminTopicsInputSchema = ListAdminTopicsFiltersSchema.partial()
	.extend(PaginationInputSchema.shape)
	.extend(adminTopicSort.shape())
	.extend(adminTopicSearch.shape())
	.extend(adminTopicPeriod.shape());

export const ListAdminTopicsItemSchema = z.object({
	id: z.string(),
	slug: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	order: z.number().int(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	pack: z.object({
		slug: z.string(),
		name: z.string(),
		status: PackStatusSchema,
		author: z.object({
			username: z.string(),
			name: z.string(),
		}),
	}),
	_count: z.object({ questions: z.number().int() }),
});

export const ListAdminTopicsOutputSchema = PaginationOutputSchema(
	ListAdminTopicsItemSchema,
);

export type ListAdminTopicsInputType = z.infer<
	typeof ListAdminTopicsInputSchema
>;
export type ListAdminTopicsOutputType = z.infer<
	typeof ListAdminTopicsOutputSchema
>;

// --- Questions ---

export const ListAdminQuestionsFiltersSchema = z.object({
	packSlugs: z.array(z.string()),
	topicSlugs: z.array(z.string()),
	authorUsernames: z.array(z.string().min(1)),
});

export const ListAdminQuestionsInputSchema =
	ListAdminQuestionsFiltersSchema.partial()
		.extend(PaginationInputSchema.shape)
		.extend(adminQuestionSort.shape())
		.extend(adminQuestionSearch.shape())
		.extend(adminQuestionPeriod.shape());

export const ListAdminQuestionsItemSchema = z.object({
	id: z.string(),
	slug: z.string(),
	text: z.string(),
	description: z.string().nullable(),
	order: z.number().int(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	topic: z.object({
		slug: z.string(),
		name: z.string(),
		order: z.number().int(),
		pack: z.object({
			slug: z.string(),
			name: z.string(),
		}),
	}),
});

export const ListAdminQuestionsOutputSchema = PaginationOutputSchema(
	ListAdminQuestionsItemSchema,
);

export type ListAdminQuestionsInputType = z.infer<
	typeof ListAdminQuestionsInputSchema
>;
export type ListAdminQuestionsOutputType = z.infer<
	typeof ListAdminQuestionsOutputSchema
>;

// --- Clicks ---

export const ListAdminClicksFiltersSchema = z.object({
	statuses: z.array(ClickStatusSchema),
	playerUsernames: z.array(z.string().min(1)),
	gameCodes: z.array(z.string().min(1)),
	questionSlugs: z.array(z.string().min(1)),
	topicSlugs: z.array(z.string().min(1)),
	packSlugs: z.array(z.string().min(1)),
	minPoints: z.int(),
	maxPoints: z.int(),
	minPos: z.int(),
	maxPos: z.int(),
	minMs: z.int(),
	maxMs: z.int(),
});

export const ListAdminClicksInputSchema = ListAdminClicksFiltersSchema.partial()
	.extend(PaginationInputSchema.shape)
	.extend(adminClickSort.shape())
	.extend(adminClickSearch.shape())
	.extend(adminClickPeriod.shape());

export const ListAdminClicksItemSchema = z.object({
	id: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	clickedAt: z.coerce.date(),
	answeredAt: z.coerce.date().nullable(),
	status: ClickStatusSchema,
	position: z.number().int(),
	reactionMs: z.number().int().nullable(),
	pointsAwarded: z.number().int(),
	game: z.object({
		id: z.string(),
		code: z.string(),
		status: GameStatusSchema,
	}),
	player: z.object({
		id: z.string(),
		score: z.number().int(),
		user: z.object({
			id: z.string(),
			username: z.string(),
			name: z.string(),
		}),
	}),
	question: z.object({
		id: z.string(),
		slug: z.string(),
		order: z.number().int(),
	}),
	topic: z.object({
		slug: z.string(),
		name: z.string(),
		order: z.number().int(),
	}),
});

export const ListAdminClicksOutputSchema = PaginationOutputSchema(
	ListAdminClicksItemSchema,
);

export type ListAdminClicksInputType = z.infer<
	typeof ListAdminClicksInputSchema
>;
export type ListAdminClicksOutputType = z.infer<
	typeof ListAdminClicksOutputSchema
>;

// --- Topic bulk jobs ---

export const ListAdminTopicBulkJobsFiltersSchema = z.object({
	statuses: z.array(TopicBulkJobStatusSchema),
});

export const ListAdminTopicBulkJobsInputSchema =
	ListAdminTopicBulkJobsFiltersSchema.partial()
		.extend(PaginationInputSchema.shape)
		.extend(adminTopicBulkJobSort.shape())
		.extend(adminTopicBulkJobSearch.shape())
		.extend(adminTopicBulkJobPeriod.shape());

export const ListAdminTopicBulkJobsItemSchema = z.object({
	id: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	packSlug: z.string(),
	status: TopicBulkJobStatusSchema,
	totalTopics: z.number().int(),
	errorMessage: z.string().nullable(),
	user: z.object({
		id: z.string(),
		username: z.string(),
		email: z.string(),
		name: z.string(),
	}),
});

export const ListAdminTopicBulkJobsOutputSchema = PaginationOutputSchema(
	ListAdminTopicBulkJobsItemSchema,
);

export type ListAdminTopicBulkJobsInputType = z.infer<
	typeof ListAdminTopicBulkJobsInputSchema
>;
export type ListAdminTopicBulkJobsOutputType = z.infer<
	typeof ListAdminTopicBulkJobsOutputSchema
>;
