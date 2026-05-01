import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	SetReactionInputType,
	SetReactionOutputType,
} from "@xamsa/schemas/modules/reaction";

function bumpTargetTotals(
	tx: Prisma.TransactionClient,
	where: { postId: string } | { commentId: string },
	delta: number,
) {
	if (delta === 0) return Promise.resolve();
	if ("postId" in where) {
		return tx.post.update({
			where: { id: where.postId },
			data: { totalReactions: { increment: delta } },
		});
	}
	return tx.comment.update({
		where: { id: where.commentId },
		data: { totalReactions: { increment: delta } },
	});
}

export async function setReaction(
	input: SetReactionInputType,
	userId: string,
): Promise<SetReactionOutputType> {
	const postId = input.postId ?? null;
	const commentId = input.commentId ?? null;

	if (postId) {
		const exists = await prisma.post.findUnique({
			where: { id: postId },
			select: { id: true },
		});
		if (!exists)
			throw new ORPCError("NOT_FOUND", { message: "Post not found." });
	}
	if (commentId) {
		const exists = await prisma.comment.findUnique({
			where: { id: commentId },
			select: { id: true },
		});
		if (!exists)
			throw new ORPCError("NOT_FOUND", { message: "Comment not found." });
	}

	return prisma.$transaction(async (tx) => {
		const whereUserTarget =
			postId != null ? { userId, postId } : { userId, commentId: commentId! };

		const existing = await tx.reaction.findFirst({
			where: whereUserTarget,
		});

		const target = postId != null ? { postId } : { commentId: commentId! };

		if (input.type === null) {
			if (!existing) return { ok: true as const, type: undefined };
			await tx.reaction.delete({ where: { id: existing.id } });
			await tx.user.update({
				where: { id: userId },
				data: { totalReactions: { decrement: 1 } },
			});
			await bumpTargetTotals(tx, target, -1);
			return { ok: true as const, type: undefined };
		}

		if (!existing) {
			await tx.reaction.create({
				data: {
					type: input.type,
					userId,
					postId,
					commentId,
				},
			});
			await tx.user.update({
				where: { id: userId },
				data: { totalReactions: { increment: 1 } },
			});
			await bumpTargetTotals(tx, target, 1);
			return { ok: true as const, type: input.type };
		}

		if (existing.type === input.type) {
			await tx.reaction.delete({ where: { id: existing.id } });
			await tx.user.update({
				where: { id: userId },
				data: { totalReactions: { decrement: 1 } },
			});
			await bumpTargetTotals(tx, target, -1);
			return { ok: true as const, type: undefined };
		}

		await tx.reaction.update({
			where: { id: existing.id },
			data: { type: input.type },
		});
		return { ok: true as const, type: input.type };
	});
}
