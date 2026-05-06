import z from "zod";
import { CursorPaginationInputSchema } from "../common/pagination";
import { PostAttachmentResourceSchema } from "../db/schemas/enums/PostAttachmentResource.schema";
import { ReactionTypeSchema } from "../db/schemas/enums/ReactionType.schema";
import { UserSchema } from "../db/schemas/models";
import { PostSchema } from "../db/schemas/models/Post.schema";
import { PostAttachmentSchema } from "../db/schemas/models/PostAttachment.schema";

export const PostAuthorSchema = UserSchema.pick({
	id: true,
	username: true,
	name: true,
	image: true,
});

export type PostAuthorType = z.infer<typeof PostAuthorSchema>;

export const PostAttachmentInputSchema = z
	.object({
		resource: PostAttachmentResourceSchema,
		gameId: z.string().min(1).optional(),
		packId: z.string().min(1).optional(),
		topicId: z.string().min(1).optional(),
	})
	.superRefine((data, ctx) => {
		let n = 0;
		let expected: "gameId" | "packId" | "topicId" | null = null;
		switch (data.resource) {
			case "game":
				expected = "gameId";
				n = data.gameId ? 1 : 0;
				break;
			case "pack":
				expected = "packId";
				n = data.packId ? 1 : 0;
				break;
			case "topic":
				expected = "topicId";
				n = data.topicId ? 1 : 0;
				break;
		}
		if (expected && n !== 1) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `${expected} must be set when resource is "${data.resource}".`,
				path: [expected],
			});
			return;
		}
		if (data.resource === "game" && (data.packId || data.topicId)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Only gameId may be set for a game attachment.",
				path: ["packId"],
			});
		}
		if (data.resource === "pack" && (data.gameId || data.topicId)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Only packId may be set for a pack attachment.",
				path: ["gameId"],
			});
		}
		if (data.resource === "topic" && (data.gameId || data.packId)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Only topicId may be set for a topic attachment.",
				path: ["gameId"],
			});
		}
	});

export type PostAttachmentInputType = z.infer<typeof PostAttachmentInputSchema>;

const PostImageMimeSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);

export const CreatePostInputSchema = z
	.object({
		body: z.string().max(10_000).optional(),
		imageBase64: z.string().min(1).optional(),
		imageMimeType: PostImageMimeSchema.optional(),
		attachment: PostAttachmentInputSchema.optional(),
	})
	.superRefine((data, ctx) => {
		const hasText = data.body != null && data.body.trim().length > 0;
		const hasImage =
			data.imageBase64 != null &&
			data.imageBase64.length > 0 &&
			data.imageMimeType != null;
		if (!hasText && !hasImage) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Provide non-empty body text and/or an image.",
				path: ["body"],
			});
		}
		if (
			(data.imageBase64 != null && data.imageBase64.length > 0) !==
			(data.imageMimeType != null)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "imageBase64 and imageMimeType must be used together.",
				path: ["imageMimeType"],
			});
		}
	});

export type CreatePostInputType = z.infer<typeof CreatePostInputSchema>;

export const DeletePostInputSchema = z.object({
	id: z.string().min(1),
});

export type DeletePostInputType = z.infer<typeof DeletePostInputSchema>;

/** Minimal nested entity for attachment cards */
export const PostAttachmentRowSchema = PostAttachmentSchema.pick({
	id: true,
	resource: true,
	gameId: true,
	packId: true,
	topicId: true,
}).extend({
	gameCode: z.string().nullish(),
	packSlug: z.string().nullish(),
	packName: z.string().nullish(),
	topicSlug: z.string().nullish(),
	topicName: z.string().nullish(),
});

export type PostAttachmentRowType = z.infer<typeof PostAttachmentRowSchema>;

/** Per emoji-type reaction counts on a post row (non-zero totals only). */
export const PostReactionByTypeSchema = z.object({
	type: ReactionTypeSchema,
	count: z.number().int().min(1),
});

export type PostReactionByTypeType = z.infer<typeof PostReactionByTypeSchema>;

export const MentionUsernameSchema = z.object({
	username: z.string(),
});

export const PostRowSchema = PostSchema.pick({
	id: true,
	slug: true,
	createdAt: true,
	body: true,
	image: true,
	totalComments: true,
	totalReactions: true,
	totalViews: true,
}).extend({
	author: PostAuthorSchema,
	attachment: PostAttachmentRowSchema.nullable(),
	myReactionType: ReactionTypeSchema.nullish(),
	reactionsByType: z.array(PostReactionByTypeSchema),
	mentions: z.array(MentionUsernameSchema),
	myBookmarked: z.boolean().optional(),
});

export type PostRowType = z.infer<typeof PostRowSchema>;

export const CreatePostOutputSchema = PostRowSchema;
export type CreatePostOutputType = z.infer<typeof CreatePostOutputSchema>;

export const DeletePostOutputSchema = z.object({
	ok: z.literal(true),
});
export type DeletePostOutputType = z.infer<typeof DeletePostOutputSchema>;

export const ListPostsFeedSchema = z.enum(["everyone", "following"]);

export const ListPostsInputSchema = CursorPaginationInputSchema.extend({
	feed: ListPostsFeedSchema.default("everyone"),
	/** When set (e.g. profile feed), returns posts by this author. Ignores home `feed=following`. */
	authorUsername: z.string().min(1).max(30).optional(),
});

export type ListPostsFeedType = z.infer<typeof ListPostsFeedSchema>;
export type ListPostsInputType = z.infer<typeof ListPostsInputSchema>;

export const ListPostsOutputSchema = z.object({
	items: z.array(PostRowSchema),
	metadata: z.object({
		cursor: z.string().optional(),
		limit: z.number().int().min(1),
		nextCursor: z.string().min(1).nullable(),
		hasMore: z.boolean(),
	}),
});

export type ListPostsOutputType = z.infer<typeof ListPostsOutputSchema>;

export const FindOnePostInputSchema = z.object({
	slug: z.string().min(1),
});

export type FindOnePostInputType = z.infer<typeof FindOnePostInputSchema>;

export const SetPostBookmarkInputSchema = z.object({
	postId: z.string().min(1),
	/** True to bookmark, false to remove. */
	bookmarked: z.boolean(),
});

export type SetPostBookmarkInputType = z.infer<
	typeof SetPostBookmarkInputSchema
>;

export const SetPostBookmarkOutputSchema = z.object({
	ok: z.literal(true),
	bookmarked: z.boolean(),
});

export type SetPostBookmarkOutputType = z.infer<
	typeof SetPostBookmarkOutputSchema
>;

export const ListBookmarkedPostsInputSchema = CursorPaginationInputSchema;

export type ListBookmarkedPostsInputType = z.infer<
	typeof ListBookmarkedPostsInputSchema
>;

/**
 * RECORD VIEW — fired by the client intersection observer when a post stays
 * at ≥50% visible for ≥1s. Client-side `sessionStorage` already dedupes per
 * session; the server simply increments the counter.
 */
export const RecordPostViewInputSchema = z.object({
	id: z.string().min(1),
});

export type RecordPostViewInputType = z.infer<typeof RecordPostViewInputSchema>;

export const RecordPostViewOutputSchema = z.object({
	totalViews: z.number().int().min(0),
});

export type RecordPostViewOutputType = z.infer<
	typeof RecordPostViewOutputSchema
>;

/**
 * INSIGHTS — author-only analytics for a single post.
 */
export const GetPostInsightsInputSchema = z.object({
	slug: z.string().min(1),
});

export type GetPostInsightsInputType = z.infer<
	typeof GetPostInsightsInputSchema
>;

const InsightsRosterMemberSchema = UserSchema.pick({
	username: true,
	name: true,
	image: true,
}).extend({
	count: z.number().int().min(0).optional(),
	at: z.coerce.date().optional(),
	reactionType: ReactionTypeSchema.optional(),
});

export const GetPostInsightsOutputSchema = z.object({
	totals: z.object({
		views: z.number().int().min(0),
		reactions: z.number().int().min(0),
		comments: z.number().int().min(0),
		bookmarks: z.number().int().min(0),
		viewToEngagementRatio: z.number().min(0),
	}),
	reactionsByType: z.array(PostReactionByTypeSchema),
	commentsBreakdown: z.object({
		topLevel: z.number().int().min(0),
		replies: z.number().int().min(0),
	}),
	rankings: z.object({
		topCommenters: z.array(InsightsRosterMemberSchema),
		firstReactors: z.array(InsightsRosterMemberSchema),
		firstCommenters: z.array(InsightsRosterMemberSchema),
		firstBookmarkers: z.array(InsightsRosterMemberSchema),
	}),
});

export type GetPostInsightsOutputType = z.infer<
	typeof GetPostInsightsOutputSchema
>;
export type PostInsightsRosterMemberType = z.infer<
	typeof InsightsRosterMemberSchema
>;
