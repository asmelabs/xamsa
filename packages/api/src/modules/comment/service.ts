import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type { ReactionType as ReactionEmoji } from "@xamsa/schemas/db/schemas/enums/ReactionType.schema";
import type {
	CommentReactionByTypeType,
	CommentThreadNodeType,
	CreateCommentInputType,
	CreateCommentOutputType,
	DeleteCommentInputType,
	DeleteCommentOutputType,
	ListCommentsByTargetInputType,
	ListCommentsByTargetOutputType,
	ListPackCommentThreadsInputType,
	ListPostCommentThreadsInputType,
	ListPostCommentThreadsOutputType,
	ListQuestionCommentThreadsInputType,
	ListTopicCommentThreadsInputType,
} from "@xamsa/schemas/modules/comment";
import { defineCursorPagination } from "@xamsa/utils/pagination";
import { notifyMentionedUsersForContent } from "../../lib/mention-notifications";
import { insertMentionsForCommentOnPost } from "../../lib/mention-write";
import {
	notifyCommentEmail,
	notifyReplyEmail,
} from "../../lib/post-engagement-notifications";
import { sortedReactionsByTypeFromGrouped } from "../reaction/sort";

const COMMENT_ROW_INCLUDE = {
	user: {
		select: {
			id: true,
			username: true,
			name: true,
			image: true,
		},
	},
} as const;

type CommentRowDb = Prisma.CommentGetPayload<{
	include: typeof COMMENT_ROW_INCLUDE;
}>;

async function usernamesForCommentMentions(
	commentIds: string[],
): Promise<Map<string, { username: string }[]>> {
	if (commentIds.length === 0) {
		return new Map();
	}
	const rows = await prisma.mention.findMany({
		where: { commentId: { in: commentIds } },
		select: {
			commentId: true,
			mentionedUser: { select: { username: true } },
		},
	});
	const map = new Map<string, { username: string }[]>();
	for (const r of rows) {
		if (r.commentId == null) {
			continue;
		}
		const arr = map.get(r.commentId) ?? [];
		arr.push({ username: r.mentionedUser.username });
		map.set(r.commentId, arr);
	}
	return map;
}

function toCommentRowType(
	row: CommentRowDb,
	mentions: { username: string }[],
	myReactionType: ReactionEmoji | null = null,
	reactionsByType: readonly CommentReactionByTypeType[] = [],
): CreateCommentOutputType {
	return {
		id: row.id,
		createdAt: row.createdAt,
		body: row.body,
		depth: row.depth,
		parentId: row.parentId,
		rootId: row.rootId,
		packId: row.packId,
		topicId: row.topicId,
		questionId: row.questionId,
		postId: row.postId,
		totalReactions: row.totalReactions,
		user: row.user,
		mentions,
		myReactionType: myReactionType ?? undefined,
		reactionsByType: [...reactionsByType],
	};
}

/**
 * Batch-fetches reaction breakdown + the viewer's reaction for a set of
 * comment ids. Mirrors the post listing pattern so comment threads can
 * render the same per-emoji counts and "your reaction" highlight.
 */
async function reactionsForComments(
	commentIds: string[],
	viewerUserId?: string,
): Promise<{
	myByCommentId: Map<string, ReactionEmoji>;
	breakdownByCommentId: Map<string, CommentReactionByTypeType[]>;
}> {
	if (commentIds.length === 0) {
		return {
			myByCommentId: new Map(),
			breakdownByCommentId: new Map(),
		};
	}

	const myByCommentId = new Map<string, ReactionEmoji>();
	if (viewerUserId) {
		const mine = await prisma.reaction.findMany({
			where: {
				userId: viewerUserId,
				commentId: { in: commentIds },
			},
			select: { commentId: true, type: true },
		});
		for (const r of mine) {
			if (r.commentId == null) continue;
			myByCommentId.set(r.commentId, r.type);
		}
	}

	const grouped = await prisma.reaction.groupBy({
		by: ["commentId", "type"],
		where: { commentId: { in: commentIds } },
		_count: { _all: true },
	});

	const rawBreakdown = new Map<
		string,
		{ type: ReactionEmoji; count: number }[]
	>();
	for (const g of grouped) {
		const cid = g.commentId;
		if (cid == null) continue;
		const n = g._count._all;
		if (n <= 0) continue;
		const bucket = rawBreakdown.get(cid);
		if (bucket) {
			bucket.push({ type: g.type, count: n });
		} else {
			rawBreakdown.set(cid, [{ type: g.type, count: n }]);
		}
	}

	const breakdownByCommentId = new Map<string, CommentReactionByTypeType[]>();
	for (const [cid, items] of rawBreakdown) {
		breakdownByCommentId.set(cid, sortedReactionsByTypeFromGrouped(items));
	}

	return { myByCommentId, breakdownByCommentId };
}

function encodePostThreadRootCursor(row: {
	createdAt: Date;
	id: string;
}): string {
	return Buffer.from(
		JSON.stringify({ c: row.createdAt.toISOString(), id: row.id }),
		"utf8",
	).toString("base64url");
}

function decodePostThreadRootCursor(
	cursor: string,
): { c: string; id: string } | null {
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

async function subtreeIdsIncludingRoot(
	tx: Prisma.TransactionClient,
	commentId: string,
): Promise<string[]> {
	const ordered: string[] = [];
	let frontier = [commentId];

	while (frontier.length > 0) {
		const current = frontier;
		ordered.push(...current);
		const kids = await tx.comment.findMany({
			where: { parentId: { in: current } },
			select: { id: true },
		});
		frontier = kids.map((k) => k.id);
	}

	return ordered;
}

async function assertTargetReferencesExist(
	tx: Prisma.TransactionClient,
	where: {
		packId: string | null;
		topicId: string | null;
		questionId: string | null;
		postId: string | null;
	},
	commentingUserId: string,
) {
	if (where.postId != null) {
		const exists = await tx.post.findUnique({
			where: { id: where.postId },
			select: { id: true },
		});
		if (!exists)
			throw new ORPCError("BAD_REQUEST", { message: "Post not found." });
		return;
	}

	const assertPackDiscussable = (pack: {
		status: string;
		visibility: string;
		authorId: string;
	}) => {
		if (pack.status !== "published") {
			throw new ORPCError("BAD_REQUEST", {
				message: "Discussion is only open on published packs.",
			});
		}
		if (pack.visibility === "private" && pack.authorId !== commentingUserId) {
			throw new ORPCError("FORBIDDEN", {
				message: "This pack is private.",
			});
		}
	};

	if (where.packId != null) {
		const pack = await tx.pack.findUnique({
			where: { id: where.packId },
			select: { id: true, status: true, visibility: true, authorId: true },
		});
		if (!pack)
			throw new ORPCError("BAD_REQUEST", { message: "Pack not found." });
		assertPackDiscussable(pack);
		return;
	}
	if (where.topicId != null) {
		const topic = await tx.topic.findUnique({
			where: { id: where.topicId },
			select: {
				id: true,
				pack: {
					select: { status: true, visibility: true, authorId: true },
				},
			},
		});
		if (!topic)
			throw new ORPCError("BAD_REQUEST", { message: "Topic not found." });
		assertPackDiscussable(topic.pack);
		return;
	}
	if (where.questionId != null) {
		const question = await tx.question.findUnique({
			where: { id: where.questionId },
			select: {
				id: true,
				topic: {
					select: {
						pack: {
							select: { status: true, visibility: true, authorId: true },
						},
					},
				},
			},
		});
		if (!question)
			throw new ORPCError("BAD_REQUEST", {
				message: "Question not found.",
			});
		assertPackDiscussable(question.topic.pack);
	}
}

function applyCountersForDelete(
	rows: Array<{ userId: string; depth: number }>,
) {
	const deltas = new Map<string, { roots: number; replies: number }>();
	for (const r of rows) {
		let d = deltas.get(r.userId);
		if (!d) {
			d = { roots: 0, replies: 0 };
			deltas.set(r.userId, d);
		}
		if (r.depth <= 0) d.roots += 1;
		else d.replies += 1;
	}
	return deltas;
}

function aggregateReactionDeltas(rows: Array<{ userId: string }>) {
	const deltas = new Map<string, number>();
	for (const r of rows) {
		deltas.set(r.userId, (deltas.get(r.userId) ?? 0) + 1);
	}
	return deltas;
}

export async function createComment(
	input: CreateCommentInputType,
	userId: string,
): Promise<CreateCommentOutputType> {
	const { created, mentionedUserIds, anchorPostId, parentCommentId } =
		await prisma.$transaction(async (tx) => {
			if (input.parentId) {
				const parent = await tx.comment.findUnique({
					where: { id: input.parentId },
					select: {
						id: true,
						packId: true,
						topicId: true,
						questionId: true,
						postId: true,
						depth: true,
						rootId: true,
					},
				});
				if (!parent)
					throw new ORPCError("BAD_REQUEST", {
						message: "Parent comment not found.",
					});

				const nextDepth = parent.depth + 1;
				if (nextDepth > 3) {
					throw new ORPCError("BAD_REQUEST", {
						message: "Maximum reply depth reached.",
					});
				}

				const inferred = {
					packId: parent.packId,
					topicId: parent.topicId,
					questionId: parent.questionId,
					postId: parent.postId,
				};

				const n =
					(input.packId ? 1 : 0) +
					(input.topicId ? 1 : 0) +
					(input.questionId ? 1 : 0) +
					(input.postId ? 1 : 0);
				if (n > 0) {
					const match =
						(input.packId ?? null) === parent.packId &&
						(input.topicId ?? null) === parent.topicId &&
						(input.questionId ?? null) === parent.questionId &&
						(input.postId ?? null) === parent.postId;
					if (!match) {
						throw new ORPCError("BAD_REQUEST", {
							message: "Reply target does not match the parent comment.",
						});
					}
				}

				const created = await tx.comment.create({
					data: {
						body: input.body,
						depth: nextDepth,
						userId,
						parentId: parent.id,
						rootId: parent.rootId,
						packId: inferred.packId,
						topicId: inferred.topicId,
						questionId: inferred.questionId,
						postId: inferred.postId,
					},
					include: COMMENT_ROW_INCLUDE,
				});

				await tx.user.update({
					where: { id: userId },
					data: { totalReplies: { increment: 1 } },
				});

				if (inferred.postId) {
					await tx.post.update({
						where: { id: inferred.postId },
						data: { totalComments: { increment: 1 } },
					});
				}

				let mentionedUserIds: string[] = [];
				if (inferred.postId) {
					mentionedUserIds = await insertMentionsForCommentOnPost(tx, {
						commentId: created.id,
						postId: inferred.postId,
						body: input.body,
						createdByUserId: userId,
					});
				}

				return {
					created,
					mentionedUserIds,
					anchorPostId: inferred.postId,
					parentCommentId: parent.id as string | null,
				};
			}

			const packId = input.packId ?? null;
			const topicId = input.topicId ?? null;
			const questionId = input.questionId ?? null;
			const postId = input.postId ?? null;
			await assertTargetReferencesExist(
				tx,
				{
					packId,
					topicId,
					questionId,
					postId,
				},
				userId,
			);

			const id = randomUUID();
			const created = await tx.comment.create({
				data: {
					id,
					body: input.body,
					depth: 0,
					userId,
					parentId: null,
					rootId: id,
					packId,
					topicId,
					questionId,
					postId,
				},
				include: COMMENT_ROW_INCLUDE,
			});

			await tx.user.update({
				where: { id: userId },
				data: { totalComments: { increment: 1 } },
			});

			if (postId) {
				await tx.post.update({
					where: { id: postId },
					data: { totalComments: { increment: 1 } },
				});
			}

			let mentionedUserIds: string[] = [];
			if (postId) {
				mentionedUserIds = await insertMentionsForCommentOnPost(tx, {
					commentId: created.id,
					postId,
					body: input.body,
					createdByUserId: userId,
				});
			}

			return {
				created,
				mentionedUserIds,
				anchorPostId: postId,
				parentCommentId: null as string | null,
			};
		});

	const mentionRows = await prisma.mention.findMany({
		where: { commentId: created.id },
		select: { mentionedUser: { select: { username: true } } },
	});
	const mentions = mentionRows.map((m) => ({
		username: m.mentionedUser.username,
	}));

	if (anchorPostId && mentionedUserIds.length > 0) {
		const [post, actor] = await Promise.all([
			prisma.post.findUnique({
				where: { id: anchorPostId },
				select: {
					slug: true,
				},
			}),
			prisma.user.findUnique({
				where: { id: userId },
				select: { name: true, username: true },
			}),
		]);
		if (post && actor) {
			const actorName =
				actor.name.trim().length > 0 ? actor.name : actor.username;
			void notifyMentionedUsersForContent({
				postId: anchorPostId,
				postSlug: post.slug,
				actorUserId: userId,
				actorDisplayName: actorName,
				mentionedUserIds,
				source: "comment",
				body: input.body,
				commentId: created.id,
			}).catch((err) => {
				console.error("[createComment] mention notify", err);
			});
		}
	}

	// Top-level comment on a post → notify the post owner.
	if (anchorPostId && parentCommentId === null) {
		void notifyCommentEmail({
			postId: anchorPostId,
			commentId: created.id,
			commentBody: input.body,
			actorUserId: userId,
		}).catch((err) => {
			console.error("[createComment] notifyCommentEmail", err);
		});
	}

	// Reply to a comment (any depth) → notify the parent comment's author.
	if (parentCommentId) {
		void notifyReplyEmail({
			parentCommentId,
			replyCommentId: created.id,
			replyBody: input.body,
			actorUserId: userId,
		}).catch((err) => {
			console.error("[createComment] notifyReplyEmail", err);
		});
	}

	return toCommentRowType(created, mentions);
}

export async function deleteComment(
	input: DeleteCommentInputType,
	userId: string,
): Promise<DeleteCommentOutputType> {
	const existing = await prisma.comment.findUnique({
		where: { id: input.id },
		select: { id: true, userId: true },
	});
	if (!existing)
		throw new ORPCError("NOT_FOUND", { message: "Comment not found." });
	if (existing.userId !== userId) {
		throw new ORPCError("FORBIDDEN", {
			message: "You can only delete your own comments.",
		});
	}

	await prisma.$transaction(async (tx) => {
		const ids = await subtreeIdsIncludingRoot(tx, input.id);
		const rows = await tx.comment.findMany({
			where: { id: { in: ids } },
			select: { userId: true, depth: true, postId: true },
		});

		const deltas = applyCountersForDelete(rows);

		const reactors = await tx.reaction.findMany({
			where: { commentId: { in: ids } },
			select: { userId: true },
		});
		const reactionDeltas = aggregateReactionDeltas(reactors);

		await tx.reaction.deleteMany({
			where: { commentId: { in: ids } },
		});

		for (const [uid, c] of reactionDeltas) {
			if (c > 0) {
				await tx.user.update({
					where: { id: uid },
					data: { totalReactions: { decrement: c } },
				});
			}
		}

		const postAffected = rows.find((r) => r.postId != null)?.postId;
		const postDed = postAffected
			? rows.filter((r) => r.postId === postAffected).length
			: 0;

		await tx.comment.deleteMany({ where: { id: { in: ids } } });

		if (postAffected && postDed > 0) {
			await tx.post.update({
				where: { id: postAffected },
				data: { totalComments: { decrement: postDed } },
			});
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
	});

	return { ok: true as const };
}

type CommentThreadTarget =
	| { kind: "post"; postId: string }
	| { kind: "pack"; packId: string }
	| { kind: "topic"; topicId: string }
	| { kind: "question"; questionId: string };

function rootsWhereForTarget(target: CommentThreadTarget) {
	switch (target.kind) {
		case "post":
			return {
				postId: target.postId,
				packId: null,
				topicId: null,
				questionId: null,
				parentId: null,
			} satisfies Prisma.CommentWhereInput;
		case "pack":
			return {
				packId: target.packId,
				topicId: null,
				postId: null,
				questionId: null,
				parentId: null,
			} satisfies Prisma.CommentWhereInput;
		case "topic":
			return {
				topicId: target.topicId,
				postId: null,
				questionId: null,
				parentId: null,
			} satisfies Prisma.CommentWhereInput;
		case "question":
			return {
				questionId: target.questionId,
				postId: null,
				parentId: null,
			} satisfies Prisma.CommentWhereInput;
	}
}

function threadsMemberWhereForTarget(
	target: CommentThreadTarget,
	rootIds: string[],
): Prisma.CommentWhereInput {
	let scoped: Prisma.CommentWhereInput;
	if (target.kind === "post") {
		scoped = { postId: target.postId };
	} else if (target.kind === "pack") {
		scoped = {
			packId: target.packId,
			topicId: null,
			postId: null,
			questionId: null,
		};
	} else if (target.kind === "topic") {
		scoped = {
			topicId: target.topicId,
			postId: null,
			questionId: null,
		};
	} else {
		scoped = {
			questionId: target.questionId,
			postId: null,
			topicId: null,
		};
	}
	return {
		AND: [scoped, { rootId: { in: rootIds } }],
	};
}

async function listCommentThreadsForTarget(
	target: CommentThreadTarget,
	input: { limit: number; cursor?: string },
	viewerUserId?: string,
): Promise<ListPostCommentThreadsOutputType> {
	const limit = input.limit ?? 8;
	const decoded = input.cursor
		? decodePostThreadRootCursor(input.cursor)
		: null;
	if (input.cursor && decoded == null) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor." });
	}

	const cursorArgs =
		decoded != null
			? {
					OR: [
						{ createdAt: { lt: new Date(decoded.c) } },
						{
							AND: [
								{ createdAt: new Date(decoded.c) },
								{ id: { lt: decoded.id } },
							],
						},
					],
				}
			: {};

	const roots = await prisma.comment.findMany({
		where: {
			...rootsWhereForTarget(target),
			...cursorArgs,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		include: COMMENT_ROW_INCLUDE,
	});

	const hasMore = roots.length > limit;
	const pageRoots = hasMore ? roots.slice(0, limit) : roots;
	const rootIds = pageRoots.map((r) => r.id);

	if (rootIds.length === 0) {
		return {
			roots: [],
			metadata: { nextCursor: null, hasMore: false },
		};
	}

	const threadRows = await prisma.comment.findMany({
		where: threadsMemberWhereForTarget(target, rootIds),
		orderBy: [{ depth: "asc" }, { createdAt: "asc" }, { id: "asc" }],
		include: COMMENT_ROW_INCLUDE,
	});

	const allIds = threadRows.map((r) => r.id);
	const mentionMap = await usernamesForCommentMentions(allIds);
	const { myByCommentId, breakdownByCommentId } = await reactionsForComments(
		allIds,
		viewerUserId,
	);

	const nodes = new Map<string, CommentThreadNodeType>();
	for (const r of threadRows) {
		const mentions = mentionMap.get(r.id) ?? [];
		nodes.set(r.id, {
			...toCommentRowType(
				r,
				mentions,
				myByCommentId.get(r.id) ?? null,
				breakdownByCommentId.get(r.id) ?? [],
			),
			replies: [],
		});
	}

	const forest: CommentThreadNodeType[] = [];
	for (const root of pageRoots) {
		const node = nodes.get(root.id);
		if (node) {
			forest.push(node);
		}
	}

	for (const r of threadRows) {
		if (r.parentId) {
			const parent = nodes.get(r.parentId);
			const child = nodes.get(r.id);
			if (parent && child) {
				parent.replies.push(child);
			}
		}
	}

	const lastRoot = pageRoots[pageRoots.length - 1];
	const nextCursor =
		hasMore && lastRoot ? encodePostThreadRootCursor(lastRoot) : null;

	return {
		roots: forest,
		metadata: { nextCursor, hasMore },
	};
}

export async function listPostCommentThreads(
	input: ListPostCommentThreadsInputType,
	viewerUserId?: string,
): Promise<ListPostCommentThreadsOutputType> {
	return listCommentThreadsForTarget(
		{ kind: "post", postId: input.postId },
		{ limit: input.limit ?? 8, cursor: input.cursor },
		viewerUserId,
	);
}

export async function listPackCommentThreads(
	input: ListPackCommentThreadsInputType,
	viewerUserId?: string,
): Promise<ListPostCommentThreadsOutputType> {
	return listCommentThreadsForTarget(
		{ kind: "pack", packId: input.packId },
		{ limit: input.limit ?? 8, cursor: input.cursor },
		viewerUserId,
	);
}

export async function listTopicCommentThreads(
	input: ListTopicCommentThreadsInputType,
	viewerUserId?: string,
): Promise<ListPostCommentThreadsOutputType> {
	return listCommentThreadsForTarget(
		{ kind: "topic", topicId: input.topicId },
		{ limit: input.limit ?? 8, cursor: input.cursor },
		viewerUserId,
	);
}

export async function listQuestionCommentThreads(
	input: ListQuestionCommentThreadsInputType,
	viewerUserId?: string,
): Promise<ListPostCommentThreadsOutputType> {
	return listCommentThreadsForTarget(
		{ kind: "question", questionId: input.questionId },
		{ limit: input.limit ?? 8, cursor: input.cursor },
		viewerUserId,
	);
}

export async function listCommentsByTarget(
	input: ListCommentsByTargetInputType,
	viewerUserId?: string,
): Promise<ListCommentsByTargetOutputType> {
	let where:
		| { packId: string }
		| { topicId: string }
		| { questionId: string }
		| { postId: string };

	if (input.packId != null) {
		where = { packId: input.packId };
	} else if (input.topicId != null) {
		where = { topicId: input.topicId };
	} else if (input.questionId != null) {
		where = { questionId: input.questionId };
	} else if (input.postId != null) {
		where = { postId: input.postId };
	} else {
		throw new ORPCError("BAD_REQUEST", {
			message: "Provide exactly one of packId, topicId, questionId, postId.",
		});
	}

	const pag = defineCursorPagination(input, input.limit);
	const cursorArgs = pag.use("id");

	const raw = await prisma.comment.findMany({
		where,
		...cursorArgs,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		include: COMMENT_ROW_INCLUDE,
	});

	const ids = raw.map((r) => r.id);
	const mentionMap = await usernamesForCommentMentions(ids);
	const { myByCommentId, breakdownByCommentId } = await reactionsForComments(
		ids,
		viewerUserId,
	);

	const enriched = raw.map((r) =>
		toCommentRowType(
			r,
			mentionMap.get(r.id) ?? [],
			myByCommentId.get(r.id) ?? null,
			breakdownByCommentId.get(r.id) ?? [],
		),
	);

	return pag.output(enriched, (r) => r.id);
}
