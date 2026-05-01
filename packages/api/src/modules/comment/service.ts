import { randomUUID } from "node:crypto";
import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	CreateCommentInputType,
	CreateCommentOutputType,
	DeleteCommentInputType,
	DeleteCommentOutputType,
	ListCommentsByTargetInputType,
	ListCommentsByTargetOutputType,
} from "@xamsa/schemas/modules/comment";
import { defineCursorPagination } from "@xamsa/utils/pagination";

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
	},
) {
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

export async function createComment(
	input: CreateCommentInputType,
	userId: string,
): Promise<CreateCommentOutputType> {
	return prisma.$transaction(async (tx) => {
		if (input.parentId) {
			const parent = await tx.comment.findUnique({
				where: { id: input.parentId },
				select: {
					id: true,
					packId: true,
					topicId: true,
					questionId: true,
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
			};

			const n =
				(input.packId ? 1 : 0) +
				(input.topicId ? 1 : 0) +
				(input.questionId ? 1 : 0);
			if (n > 0) {
				const match =
					(input.packId ?? null) === parent.packId &&
					(input.topicId ?? null) === parent.topicId &&
					(input.questionId ?? null) === parent.questionId;
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
				},
				include: COMMENT_ROW_INCLUDE,
			});

			await tx.user.update({
				where: { id: userId },
				data: { totalReplies: { increment: 1 } },
			});

			return created;
		}

		const packId = input.packId ?? null;
		const topicId = input.topicId ?? null;
		const questionId = input.questionId ?? null;
		await assertTargetReferencesExist(tx, { packId, topicId, questionId });

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
			},
			include: COMMENT_ROW_INCLUDE,
		});

		await tx.user.update({
			where: { id: userId },
			data: { totalComments: { increment: 1 } },
		});

		return created;
	});
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
			select: { userId: true, depth: true },
		});

		const deltas = applyCountersForDelete(rows);

		await tx.comment.deleteMany({ where: { id: { in: ids } } });

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

export async function listCommentsByTarget(
	input: ListCommentsByTargetInputType,
): Promise<ListCommentsByTargetOutputType> {
	let where: { packId: string } | { topicId: string } | { questionId: string };

	if (input.packId != null) {
		where = { packId: input.packId };
	} else if (input.topicId != null) {
		where = { topicId: input.topicId };
	} else if (input.questionId != null) {
		where = { questionId: input.questionId };
	} else {
		throw new ORPCError("BAD_REQUEST", {
			message: "Provide exactly one of packId, topicId, questionId.",
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

	return pag.output(raw, (r) => r.id);
}
