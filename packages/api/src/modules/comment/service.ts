import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	CommentThreadNodeType,
	CreateCommentInputType,
	CreateCommentOutputType,
	DeleteCommentInputType,
	DeleteCommentOutputType,
	ListCommentsByTargetInputType,
	ListCommentsByTargetOutputType,
	ListPostCommentThreadsInputType,
	ListPostCommentThreadsOutputType,
} from "@xamsa/schemas/modules/comment";
import { defineCursorPagination } from "@xamsa/utils/pagination";
import { notifyMentionedUsersForContent } from "../../lib/mention-notifications";
import { insertMentionsForCommentOnPost } from "../../lib/mention-write";

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
	};
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
	if (where.packId != null) {
		const exists = await tx.pack.findUnique({
			where: { id: where.packId },
			select: { id: true },
		});
		if (!exists)
			throw new ORPCError("BAD_REQUEST", { message: "Pack not found." });
		return;
	}
	if (where.topicId != null) {
		const exists = await tx.topic.findUnique({
			where: { id: where.topicId },
			select: { id: true },
		});
		if (!exists)
			throw new ORPCError("BAD_REQUEST", { message: "Topic not found." });
		return;
	}
	if (where.questionId != null) {
		const exists = await tx.question.findUnique({
			where: { id: where.questionId },
			select: { id: true },
		});
		if (!exists)
			throw new ORPCError("BAD_REQUEST", { message: "Question not found." });
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
	const { created, mentionedUserIds, anchorPostId } = await prisma.$transaction(
		async (tx) => {
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
				};
			}

			const packId = input.packId ?? null;
			const topicId = input.topicId ?? null;
			const questionId = input.questionId ?? null;
			const postId = input.postId ?? null;
			await assertTargetReferencesExist(tx, {
				packId,
				topicId,
				questionId,
				postId,
			});

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
			};
		},
	);

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

export async function listPostCommentThreads(
	input: ListPostCommentThreadsInputType,
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
			postId: input.postId,
			parentId: null,
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
		where: { postId: input.postId, rootId: { in: rootIds } },
		orderBy: [{ depth: "asc" }, { createdAt: "asc" }, { id: "asc" }],
		include: COMMENT_ROW_INCLUDE,
	});

	const allIds = threadRows.map((r) => r.id);
	const mentionMap = await usernamesForCommentMentions(allIds);

	const nodes = new Map<string, CommentThreadNodeType>();
	for (const r of threadRows) {
		const mentions = mentionMap.get(r.id) ?? [];
		nodes.set(r.id, { ...toCommentRowType(r, mentions), replies: [] });
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

export async function listCommentsByTarget(
	input: ListCommentsByTargetInputType,
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

	const mentionMap = await usernamesForCommentMentions(raw.map((r) => r.id));
	const enriched = raw.map((r) => ({
		...r,
		mentions: mentionMap.get(r.id) ?? [],
	}));

	return pag.output(enriched, (r) => r.id);
}
