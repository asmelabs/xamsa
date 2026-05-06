import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import { env } from "@xamsa/env/server";
import type { ReactionType as ReactionEmoji } from "@xamsa/schemas/db/schemas/enums/ReactionType.schema";
import type {
	CreatePostInputType,
	CreatePostOutputType,
	DeletePostInputType,
	DeletePostOutputType,
	FindOnePostInputType,
	GetPostInsightsInputType,
	GetPostInsightsOutputType,
	ListBookmarkedPostsInputType,
	ListPostsInputType,
	ListPostsOutputType,
	PostAttachmentRowType,
	PostInsightsRosterMemberType,
	PostReactionByTypeType,
	PostRowType,
	RecordPostViewInputType,
	RecordPostViewOutputType,
	SetPostBookmarkInputType,
	SetPostBookmarkOutputType,
} from "@xamsa/schemas/modules/post";
import {
	destroyImageByPublicId,
	extractPublicIdFromDeliveryUrl,
	getPostImagePublicId,
	isManagedPostImageUrl,
	uploadPostImage,
} from "@xamsa/upload";
import { derivePostSlugSeedFromBody } from "@xamsa/utils/post-slug";
import { generateUniqueSlug } from "@xamsa/utils/slugify";
import { notifyMentionedUsersForContent } from "../../lib/mention-notifications";
import { insertMentionsForPost } from "../../lib/mention-write";
import { captureSubjectNotificationsForRemoval } from "../notification/delete";
import { notifyMention } from "../notification/dispatchers";
import { sortedReactionsByTypeFromGrouped } from "../reaction/sort";

const FEED_AUTHOR = {
	select: { id: true, username: true, name: true, image: true },
} as const;

type PostWithRelations = Prisma.PostGetPayload<{
	include: {
		author: typeof FEED_AUTHOR;
		attachment: true;
	};
}>;

function encodePostCursor(row: { createdAt: Date; id: string }): string {
	return Buffer.from(
		JSON.stringify({ c: row.createdAt.toISOString(), id: row.id }),
		"utf8",
	).toString("base64url");
}

function decodePostCursor(cursor: string): { c: string; id: string } | null {
	try {
		const raw = Buffer.from(cursor, "base64url").toString("utf8");
		const o = JSON.parse(raw) as { c?: string; id?: string };
		if (
			typeof o.c !== "string" ||
			typeof o.id !== "string" ||
			Number.isNaN(Date.parse(o.c))
		) {
			return null;
		}
		return { c: o.c, id: o.id };
	} catch {
		return null;
	}
}

function encodeBookmarkCursor(row: {
	createdAt: Date;
	postId: string;
}): string {
	return Buffer.from(
		JSON.stringify({ c: row.createdAt.toISOString(), p: row.postId }),
		"utf8",
	).toString("base64url");
}

function decodeBookmarkCursor(cursor: string): { c: string; p: string } | null {
	try {
		const raw = Buffer.from(cursor, "base64url").toString("utf8");
		const o = JSON.parse(raw) as { c?: string; p?: string };
		if (
			typeof o.c !== "string" ||
			typeof o.p !== "string" ||
			Number.isNaN(Date.parse(o.c))
		) {
			return null;
		}
		return { c: o.c, p: o.p };
	} catch {
		return null;
	}
}

async function postIdsBookmarkedBy(
	userId: string | undefined,
	postIds: string[],
): Promise<Set<string>> {
	if (!userId || postIds.length === 0) return new Set();
	const rows = await prisma.postBookmark.findMany({
		where: { userId, postId: { in: postIds } },
		select: { postId: true },
	});
	return new Set(rows.map((r) => r.postId));
}

async function usernamesForPostMentions(
	postIds: string[],
): Promise<Map<string, { username: string }[]>> {
	if (postIds.length === 0) {
		return new Map();
	}
	const rows = await prisma.mention.findMany({
		where: { postId: { in: postIds }, commentId: null },
		select: {
			postId: true,
			mentionedUser: { select: { username: true } },
		},
	});
	const map = new Map<string, { username: string }[]>();
	for (const r of rows) {
		if (r.postId == null) {
			continue;
		}
		const arr = map.get(r.postId) ?? [];
		arr.push({ username: r.mentionedUser.username });
		map.set(r.postId, arr);
	}
	return map;
}

async function validateAttachmentCreateInput(
	tx: Prisma.TransactionClient,
	input: NonNullable<CreatePostInputType["attachment"]>,
): Promise<Prisma.PostAttachmentUncheckedCreateWithoutPostInput> {
	const attachId = randomUUID();
	switch (input.resource) {
		case "game": {
			const gid = input.gameId!;
			const game = await tx.game.findUnique({
				where: { id: gid },
				select: { id: true, status: true },
			});
			if (!game)
				throw new ORPCError("BAD_REQUEST", { message: "Game not found." });
			if (game.status !== "waiting" && game.status !== "completed") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Only waiting or completed games can be attached.",
				});
			}
			return {
				id: attachId,
				resource: "game",
				gameId: game.id,
				packId: null,
				topicId: null,
			};
		}
		case "pack": {
			const pid = input.packId!;
			const pack = await tx.pack.findUnique({
				where: { id: pid },
				select: { id: true, status: true },
			});
			if (!pack)
				throw new ORPCError("BAD_REQUEST", { message: "Pack not found." });
			if (pack.status !== "published") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Only published packs can be attached.",
				});
			}
			return {
				id: attachId,
				resource: "pack",
				packId: pack.id,
				gameId: null,
				topicId: null,
			};
		}
		case "topic": {
			const tid = input.topicId!;
			const topic = await tx.topic.findUnique({
				where: { id: tid },
				select: { id: true, pack: { select: { status: true } } },
			});
			if (!topic)
				throw new ORPCError("BAD_REQUEST", { message: "Topic not found." });
			if (topic.pack.status !== "published") {
				throw new ORPCError("BAD_REQUEST", {
					message: "Only topics from published packs can be attached.",
				});
			}
			return {
				id: attachId,
				resource: "topic",
				topicId: topic.id,
				gameId: null,
				packId: null,
			};
		}
	}
}

async function buildAttachmentRow(
	att: NonNullable<PostWithRelations["attachment"]>,
): Promise<PostAttachmentRowType> {
	const base: PostAttachmentRowType = {
		id: att.id,
		resource: att.resource,
		gameId: att.gameId,
		packId: att.packId,
		topicId: att.topicId,
		gameCode: null,
		packSlug: null,
		packName: null,
		topicSlug: null,
		topicName: null,
	};

	if (att.resource === "game" && att.gameId) {
		const g = await prisma.game.findUnique({
			where: { id: att.gameId },
			select: { code: true },
		});
		return { ...base, gameCode: g?.code ?? null };
	}

	if (att.resource === "pack" && att.packId) {
		const p = await prisma.pack.findUnique({
			where: { id: att.packId },
			select: { slug: true, name: true },
		});
		return { ...base, packSlug: p?.slug ?? null, packName: p?.name ?? null };
	}

	if (att.resource === "topic" && att.topicId) {
		const t = await prisma.topic.findUnique({
			where: { id: att.topicId },
			select: {
				slug: true,
				name: true,
				pack: { select: { slug: true, name: true } },
			},
		});
		return {
			...base,
			topicSlug: t?.slug ?? null,
			topicName: t?.name ?? null,
			packSlug: t?.pack.slug ?? null,
			packName: t?.pack.name ?? null,
		};
	}

	return base;
}

async function toPostRow(
	p: PostWithRelations,
	myReactionType?: ReactionEmoji | null,
	reactionsByType: readonly PostReactionByTypeType[] = [],
	mentions: readonly { username: string }[] = [],
	myBookmarked?: boolean,
): Promise<PostRowType> {
	const attachmentRow = p.attachment
		? await buildAttachmentRow(p.attachment)
		: null;
	return {
		id: p.id,
		slug: p.slug,
		createdAt: p.createdAt,
		body: p.body,
		image: p.image,
		totalComments: p.totalComments,
		totalReactions: p.totalReactions,
		totalViews: p.totalViews,
		author: p.author,
		attachment: attachmentRow,
		myReactionType: myReactionType ?? undefined,
		reactionsByType: [...reactionsByType],
		mentions: [...mentions],
		...(myBookmarked !== undefined ? { myBookmarked } : {}),
	};
}

export async function createPost(
	input: CreatePostInputType,
	userId: string,
): Promise<CreatePostOutputType> {
	const postId = randomUUID();

	const trimmedBody =
		input.body != null && input.body.trim().length > 0
			? input.body.trim()
			: null;

	const author = await prisma.user.findUnique({
		where: { id: userId },
		select: { username: true },
	});
	if (!author) {
		throw new ORPCError("UNAUTHORIZED", { message: "User not found." });
	}

	const slugSeed = derivePostSlugSeedFromBody(trimmedBody);
	const slug = await generateUniqueSlug(
		slugSeed,
		async (candidate) =>
			!!(await prisma.post.findUnique({
				where: { slug: candidate },
				select: { id: true },
			})),
		{ maxAttempts: 120, suffixVariant: "counter", suffixSeparator: "-" },
	);

	let imageUrl: string | null = null;
	let imagePidStored: string | null = null;

	if (input.imageBase64?.length && input.imageMimeType) {
		let buffer: Buffer;
		try {
			buffer = Buffer.from(input.imageBase64, "base64");
		} catch {
			throw new ORPCError("BAD_REQUEST", { message: "Invalid image data." });
		}
		if (buffer.byteLength === 0) {
			throw new ORPCError("BAD_REQUEST", { message: "Invalid image data." });
		}
		const logicalPublicId = getPostImagePublicId(author.username, slug, 1);
		try {
			const up = await uploadPostImage({
				buffer,
				mimeType: input.imageMimeType,
				publicId: logicalPublicId,
			});
			imageUrl = up.secureUrl;
			imagePidStored = up.publicId;
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Could not upload image.";
			throw new ORPCError("BAD_REQUEST", { message: msg });
		}
	}

	let transactionFailedAfterUpload = false;
	try {
		const { created, mentionedUserIds } = await prisma.$transaction(
			async (tx) => {
				const attachUnchecked = input.attachment
					? await validateAttachmentCreateInput(tx, input.attachment)
					: null;

				await tx.post.create({
					data: {
						id: postId,
						slug,
						body: trimmedBody,
						image: imageUrl,
						imagePublicId: imagePidStored,
						userId,
						...(attachUnchecked != null && {
							attachment: {
								create: attachUnchecked,
							},
						}),
					},
				});

				await tx.user.update({
					where: { id: userId },
					data: { totalPosts: { increment: 1 } },
				});

				const row = await tx.post.findUniqueOrThrow({
					where: { id: postId },
					include: { author: FEED_AUTHOR, attachment: true },
				});

				const mentionedUserIds = await insertMentionsForPost(tx, {
					postId,
					body: trimmedBody,
					createdByUserId: userId,
				});

				return { created: row, mentionedUserIds };
			},
		);

		const mentionUsernames = await prisma.mention.findMany({
			where: { postId: created.id, commentId: null },
			select: { mentionedUser: { select: { username: true } } },
		});
		const mentions = mentionUsernames.map((m) => ({
			username: m.mentionedUser.username,
		}));

		if (mentionedUserIds.length > 0) {
			const actorName =
				created.author.name.trim().length > 0
					? created.author.name
					: created.author.username;
			void notifyMentionedUsersForContent({
				postId: created.id,
				postSlug: created.slug,
				actorUserId: userId,
				actorDisplayName: actorName,
				mentionedUserIds,
				source: "post",
				body: trimmedBody ?? "",
			}).catch((err) => {
				console.error("[createPost] mention notify", err);
			});
			void notifyMention({
				mentionedUserIds,
				actorUserId: userId,
				source: "post",
				postId: created.id,
			}).catch((err) => {
				console.error("[createPost] in-app mention notify", err);
			});
		}

		return toPostRow(created, null, [], mentions);
	} catch (e) {
		transactionFailedAfterUpload = !!imagePidStored;
		if (transactionFailedAfterUpload && imagePidStored) {
			try {
				await destroyImageByPublicId(imagePidStored);
			} catch (cleanupErr) {
				console.error("[createPost] cloudinary cleanup:", cleanupErr);
			}
		}
		throw e;
	}
}

export async function deletePost(
	input: DeletePostInputType,
	userId: string,
): Promise<DeletePostOutputType> {
	const post = await prisma.post.findUnique({
		where: { id: input.id },
		select: {
			id: true,
			userId: true,
			imagePublicId: true,
			image: true,
		},
	});

	if (!post) throw new ORPCError("NOT_FOUND", { message: "Post not found." });
	if (post.userId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "You can only delete your own posts.",
		});
	}

	const commentRows = await prisma.comment.findMany({
		where: { postId: post.id },
		select: { userId: true, depth: true },
	});

	const deltas = new Map<string, { roots: number; replies: number }>();
	for (const r of commentRows) {
		let d = deltas.get(r.userId);
		if (!d) {
			d = { roots: 0, replies: 0 };
			deltas.set(r.userId, d);
		}
		if (r.depth <= 0) d.roots += 1;
		else d.replies += 1;
	}

	const reactionRows = await prisma.reaction.findMany({
		where: {
			OR: [{ postId: post.id }, { comment: { postId: post.id } }],
		},
		select: { userId: true },
	});

	const reactionDeltas = new Map<string, number>();
	for (const r of reactionRows) {
		reactionDeltas.set(r.userId, (reactionDeltas.get(r.userId) ?? 0) + 1);
	}

	const commentIds = (
		await prisma.comment.findMany({
			where: { postId: post.id },
			select: { id: true },
		})
	).map((c) => c.id);

	const broadcastNotificationRemoval =
		await captureSubjectNotificationsForRemoval({
			postIds: [post.id],
			commentIds,
		});

	await prisma.$transaction(async (tx) => {
		await tx.reaction.deleteMany({
			where: {
				OR: [{ postId: post.id }, { comment: { postId: post.id } }],
			},
		});

		await tx.comment.deleteMany({
			where: { postId: post.id, parentId: null },
		});

		for (const [uid, delta] of reactionDeltas) {
			if (delta > 0) {
				await tx.user.update({
					where: { id: uid },
					data: { totalReactions: { decrement: delta } },
				});
			}
		}

		for (const [uid, { roots, replies }] of deltas) {
			if (roots === 0 && replies === 0) continue;
			await tx.user.update({
				where: { id: uid },
				data: {
					...(roots > 0 ? { totalComments: { decrement: roots } } : {}),
					...(replies > 0 ? { totalReplies: { decrement: replies } } : {}),
				},
			});
		}

		await tx.post.delete({ where: { id: post.id } });

		await tx.user.update({
			where: { id: userId },
			data: { totalPosts: { decrement: 1 } },
		});
	});

	void broadcastNotificationRemoval().catch((err) => {
		console.error("[deletePost] notification removal broadcast", err);
	});

	let pidToDestroy: string | null = post.imagePublicId;
	if (!pidToDestroy && post.image && env.CLOUDINARY_CLOUD_NAME) {
		if (isManagedPostImageUrl(post.image)) {
			pidToDestroy = extractPublicIdFromDeliveryUrl(
				post.image,
				env.CLOUDINARY_CLOUD_NAME,
			);
		}
	}

	if (pidToDestroy) {
		try {
			await destroyImageByPublicId(pidToDestroy);
		} catch (e) {
			console.error("[deletePost] cloudinary destroy:", e);
		}
	}

	return { ok: true as const };
}

export async function findOnePost(
	input: FindOnePostInputType,
	viewerUserId?: string,
): Promise<PostRowType> {
	const row = await prisma.post.findFirst({
		where: { slug: input.slug },
		include: { author: FEED_AUTHOR, attachment: true },
	});

	if (!row) {
		throw new ORPCError("NOT_FOUND", { message: "Post not found." });
	}

	let myReactionType: ReactionEmoji | null = null;
	if (viewerUserId) {
		const mine = await prisma.reaction.findFirst({
			where: { userId: viewerUserId, postId: row.id },
			select: { type: true },
		});
		myReactionType = mine?.type ?? null;
	}

	const grouped = await prisma.reaction.groupBy({
		by: ["postId", "type"],
		where: { postId: row.id },
		_count: { _all: true },
	});

	const reactionsByType = sortedReactionsByTypeFromGrouped(
		grouped
			.map((g) => {
				const pid = g.postId;
				if (pid == null) {
					return null;
				}
				return { type: g.type, count: g._count._all };
			})
			.filter((x): x is { type: ReactionEmoji; count: number } => x != null),
	);

	const mentionMap = await usernamesForPostMentions([row.id]);

	let myBookmarked: boolean | undefined;
	if (viewerUserId) {
		const bm = await prisma.postBookmark.findUnique({
			where: {
				userId_postId: { userId: viewerUserId, postId: row.id },
			},
			select: { postId: true },
		});
		myBookmarked = bm != null;
	}

	return toPostRow(
		row as PostWithRelations,
		myReactionType,
		reactionsByType,
		mentionMap.get(row.id) ?? [],
		myBookmarked,
	);
}

export async function listPosts(
	input: ListPostsInputType,
	currentUserId?: string,
): Promise<ListPostsOutputType> {
	const limit = input.limit ?? 10;
	let cursorDecoded: { c: string; id: string } | null = null;
	if (input.cursor) {
		cursorDecoded = decodePostCursor(input.cursor);
		if (!cursorDecoded)
			throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor." });
	}

	const decoded = cursorDecoded;

	const followingFeed = !input.authorUsername && input.feed === "following";
	if (followingFeed && !currentUserId) {
		throw new ORPCError("UNAUTHORIZED", {
			message: "Sign in to see posts from people you follow.",
		});
	}

	const parts: Prisma.PostWhereInput[] = [];

	if (input.authorUsername != null) {
		parts.push({ author: { username: input.authorUsername } });
	} else if (followingFeed && currentUserId) {
		parts.push({
			author: {
				followers: {
					some: {
						followerId: currentUserId,
						status: "accepted",
					},
				},
			},
		});
	}

	if (decoded != null) {
		parts.push({
			OR: [
				{ createdAt: { lt: new Date(decoded.c) } },
				{
					AND: [{ createdAt: new Date(decoded.c) }, { id: { lt: decoded.id } }],
				},
			],
		});
	}

	const where: Prisma.PostWhereInput =
		parts.length === 0
			? {}
			: parts.length === 1
				? (parts[0] ?? {})
				: { AND: parts };

	const rows = await prisma.post.findMany({
		where,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		include: { author: FEED_AUTHOR, attachment: true },
	});

	const hasMore = rows.length > limit;
	const page = hasMore ? rows.slice(0, limit) : rows;
	const nextLast = page[page.length - 1];
	const nextCursor = hasMore && nextLast ? encodePostCursor(nextLast) : null;

	let reactionByPost = new Map<string, ReactionEmoji>();
	if (currentUserId && page.length > 0) {
		const mine = await prisma.reaction.findMany({
			where: {
				userId: currentUserId,
				postId: { in: page.map((p) => p.id) },
			},
			select: { postId: true, type: true },
		});
		reactionByPost = new Map(
			mine
				.filter((r): r is typeof r & { postId: string } => r.postId != null)
				.map((r) => [r.postId, r.type]),
		);
	}

	const breakdownByPostId = new Map<
		string,
		{ type: ReactionEmoji; count: number }[]
	>();
	if (page.length > 0) {
		const grouped = await prisma.reaction.groupBy({
			by: ["postId", "type"],
			where: { postId: { in: page.map((p) => p.id) } },
			_count: { _all: true },
		});
		for (const row of grouped) {
			const pid = row.postId;
			if (pid == null) continue;
			const n = row._count._all;
			if (n <= 0) continue;
			const bucket = breakdownByPostId.get(pid);
			if (bucket) {
				bucket.push({ type: row.type, count: n });
			} else {
				breakdownByPostId.set(pid, [{ type: row.type, count: n }]);
			}
		}
	}

	const mentionMap = await usernamesForPostMentions(page.map((p) => p.id));

	const bookmarked = await postIdsBookmarkedBy(
		currentUserId,
		page.map((p) => p.id),
	);

	const items = await Promise.all(
		page.map((p) =>
			toPostRow(
				p as PostWithRelations,
				reactionByPost.get(p.id) ?? null,
				sortedReactionsByTypeFromGrouped(breakdownByPostId.get(p.id) ?? []),
				mentionMap.get(p.id) ?? [],
				currentUserId ? bookmarked.has(p.id) : undefined,
			),
		),
	);

	return {
		items,
		metadata: {
			cursor: input.cursor,
			limit,
			nextCursor,
			hasMore,
		},
	};
}

export async function setPostBookmark(
	input: SetPostBookmarkInputType,
	userId: string,
): Promise<SetPostBookmarkOutputType> {
	const post = await prisma.post.findUnique({
		where: { id: input.postId },
		select: { id: true },
	});
	if (!post) {
		throw new ORPCError("NOT_FOUND", { message: "Post not found." });
	}

	if (input.bookmarked) {
		await prisma.postBookmark.upsert({
			where: {
				userId_postId: { userId, postId: input.postId },
			},
			create: { userId, postId: input.postId },
			update: {},
		});
	} else {
		await prisma.postBookmark.deleteMany({
			where: { userId, postId: input.postId },
		});
	}

	return { ok: true as const, bookmarked: input.bookmarked };
}

export async function listBookmarkedPosts(
	input: ListBookmarkedPostsInputType,
	userId: string,
): Promise<ListPostsOutputType> {
	const limit = input.limit ?? 10;

	let cursorDecoded: { c: string; p: string } | null = null;
	if (input.cursor) {
		cursorDecoded = decodeBookmarkCursor(input.cursor);
		if (!cursorDecoded) {
			throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor." });
		}
	}

	const marks = await prisma.postBookmark.findMany({
		where: {
			userId,
			...(cursorDecoded != null
				? {
						OR: [
							{ createdAt: { lt: new Date(cursorDecoded.c) } },
							{
								AND: [
									{ createdAt: new Date(cursorDecoded.c) },
									{ postId: { lt: cursorDecoded.p } },
								],
							},
						],
					}
				: {}),
		},
		orderBy: [{ createdAt: "desc" }, { postId: "desc" }],
		take: limit + 1,
		include: {
			post: { include: { author: FEED_AUTHOR, attachment: true } },
		},
	});

	const hasMore = marks.length > limit;
	const pageMarks = hasMore ? marks.slice(0, limit) : marks;
	const page = pageMarks.map((m) => m.post);

	const nextLastMark = pageMarks[pageMarks.length - 1];
	const nextCursor =
		hasMore && nextLastMark
			? encodeBookmarkCursor({
					createdAt: nextLastMark.createdAt,
					postId: nextLastMark.postId,
				})
			: null;

	let reactionByPost = new Map<string, ReactionEmoji>();
	if (page.length > 0) {
		const mine = await prisma.reaction.findMany({
			where: {
				userId,
				postId: { in: page.map((p) => p.id) },
			},
			select: { postId: true, type: true },
		});
		reactionByPost = new Map(
			mine
				.filter((r): r is typeof r & { postId: string } => r.postId != null)
				.map((r) => [r.postId, r.type]),
		);
	}

	const breakdownByPostId = new Map<
		string,
		{ type: ReactionEmoji; count: number }[]
	>();
	if (page.length > 0) {
		const grouped = await prisma.reaction.groupBy({
			by: ["postId", "type"],
			where: { postId: { in: page.map((p) => p.id) } },
			_count: { _all: true },
		});
		for (const row of grouped) {
			const pid = row.postId;
			if (pid == null) continue;
			const n = row._count._all;
			if (n <= 0) continue;
			const bucket = breakdownByPostId.get(pid);
			if (bucket) {
				bucket.push({ type: row.type, count: n });
			} else {
				breakdownByPostId.set(pid, [{ type: row.type, count: n }]);
			}
		}
	}

	const mentionMap = await usernamesForPostMentions(page.map((p) => p.id));

	const items = await Promise.all(
		page.map((p) =>
			toPostRow(
				p as PostWithRelations,
				reactionByPost.get(p.id) ?? null,
				sortedReactionsByTypeFromGrouped(breakdownByPostId.get(p.id) ?? []),
				mentionMap.get(p.id) ?? [],
				true,
			),
		),
	);

	return {
		items,
		metadata: {
			cursor: input.cursor,
			limit,
			nextCursor,
			hasMore,
		},
	};
}

/**
 * Bumps `Post.totalViews` by 1. Client-side `sessionStorage` already prevents
 * double counts within a session; we keep this lean (no per-IP table) and
 * silently no-op when the post is missing.
 */
export async function recordPostView(
	input: RecordPostViewInputType,
): Promise<RecordPostViewOutputType> {
	const updated = await prisma.post
		.update({
			where: { id: input.id },
			data: { totalViews: { increment: 1 } },
			select: { totalViews: true },
		})
		.catch(() => null);

	if (!updated) {
		return { totalViews: 0 };
	}
	return { totalViews: updated.totalViews };
}

const INSIGHTS_RANKING_LIMIT = 5;

/**
 * Author-only post analytics: headline counters, reaction/comment breakdowns,
 * and small "first/top" rankings backed by `groupBy` + `findMany` queries.
 */
export async function getPostInsights(
	input: GetPostInsightsInputType,
	viewerUserId: string,
): Promise<GetPostInsightsOutputType> {
	const post = await prisma.post.findUnique({
		where: { slug: input.slug },
		select: {
			id: true,
			userId: true,
			totalViews: true,
			totalReactions: true,
			totalComments: true,
		},
	});

	if (!post) {
		throw new ORPCError("NOT_FOUND", { message: "Post not found." });
	}

	if (post.userId !== viewerUserId) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the post author can view insights.",
		});
	}

	const [
		bookmarkCount,
		reactionGroups,
		commentParentGroups,
		topCommenterGroups,
		firstReactionRows,
		firstCommentRows,
		firstBookmarkRows,
	] = await Promise.all([
		prisma.postBookmark.count({ where: { postId: post.id } }),
		prisma.reaction.groupBy({
			by: ["type"],
			where: { postId: post.id },
			_count: { _all: true },
		}),
		prisma.comment.groupBy({
			by: ["parentId"],
			where: { postId: post.id },
			_count: { _all: true },
		}),
		prisma.comment.groupBy({
			by: ["userId"],
			where: { postId: post.id },
			_count: { _all: true },
			orderBy: { _count: { userId: "desc" } },
			take: INSIGHTS_RANKING_LIMIT,
		}),
		prisma.reaction.findMany({
			where: { postId: post.id },
			orderBy: { createdAt: "asc" },
			take: INSIGHTS_RANKING_LIMIT,
			select: {
				createdAt: true,
				type: true,
				user: { select: { username: true, name: true, image: true } },
			},
		}),
		prisma.comment.findMany({
			where: { postId: post.id },
			orderBy: { createdAt: "asc" },
			distinct: ["userId"],
			take: INSIGHTS_RANKING_LIMIT,
			select: {
				createdAt: true,
				user: { select: { username: true, name: true, image: true } },
			},
		}),
		prisma.postBookmark.findMany({
			where: { postId: post.id },
			orderBy: { createdAt: "asc" },
			take: INSIGHTS_RANKING_LIMIT,
			select: {
				createdAt: true,
				user: { select: { username: true, name: true, image: true } },
			},
		}),
	]);

	const reactionsByType = sortedReactionsByTypeFromGrouped(
		reactionGroups.map((g) => ({
			type: g.type,
			count: g._count._all,
		})),
	);

	let topLevel = 0;
	let replies = 0;
	for (const row of commentParentGroups) {
		if (row.parentId === null) topLevel += row._count._all;
		else replies += row._count._all;
	}

	const topCommenterUserIds = topCommenterGroups.map((g) => g.userId);
	const topCommenterUsers =
		topCommenterUserIds.length === 0
			? []
			: await prisma.user.findMany({
					where: { id: { in: topCommenterUserIds } },
					select: {
						id: true,
						username: true,
						name: true,
						image: true,
					},
				});
	const topCommenterById = new Map(topCommenterUsers.map((u) => [u.id, u]));
	const topCommenters: PostInsightsRosterMemberType[] = [];
	for (const g of topCommenterGroups) {
		const u = topCommenterById.get(g.userId);
		if (!u) continue;
		topCommenters.push({
			username: u.username,
			name: u.name,
			image: u.image,
			count: g._count._all,
		});
	}

	const firstReactors: PostInsightsRosterMemberType[] = firstReactionRows.map(
		(r) => ({
			username: r.user.username,
			name: r.user.name,
			image: r.user.image,
			at: r.createdAt,
			reactionType: r.type,
		}),
	);

	const firstCommenters: PostInsightsRosterMemberType[] = firstCommentRows.map(
		(r) => ({
			username: r.user.username,
			name: r.user.name,
			image: r.user.image,
			at: r.createdAt,
		}),
	);

	const firstBookmarkers: PostInsightsRosterMemberType[] =
		firstBookmarkRows.map((r) => ({
			username: r.user.username,
			name: r.user.name,
			image: r.user.image,
			at: r.createdAt,
		}));

	const totalEngagement =
		post.totalReactions + post.totalComments + bookmarkCount;
	const ratio = post.totalViews > 0 ? totalEngagement / post.totalViews : 0;

	return {
		totals: {
			views: post.totalViews,
			reactions: post.totalReactions,
			comments: post.totalComments,
			bookmarks: bookmarkCount,
			viewToEngagementRatio: Number(ratio.toFixed(4)),
		},
		reactionsByType,
		commentsBreakdown: { topLevel, replies },
		rankings: {
			topCommenters,
			firstReactors,
			firstCommenters,
			firstBookmarkers,
		},
	};
}
