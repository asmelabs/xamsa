import { ORPCError } from "@orpc/server";
import prisma, { type Prisma } from "@xamsa/db";
import type {
	ListReactorsInputType,
	ListReactorsOutputType,
	SetReactionInputType,
	SetReactionOutputType,
} from "@xamsa/schemas/modules/reaction";
import { defineCursorPagination } from "@xamsa/utils/pagination";
import { notifyReactionEmail } from "../../lib/post-engagement-notifications";
import { deleteReactionNotification } from "../notification/delete";
import { notifyReaction } from "../notification/dispatchers";

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

	const result = await prisma.$transaction(async (tx) => {
		const whereUserTarget =
			postId != null ? { userId, postId } : { userId, commentId: commentId! };

		const existing = await tx.reaction.findFirst({
			where: whereUserTarget,
		});

		const target = postId != null ? { postId } : { commentId: commentId! };

		if (input.type === null) {
			if (!existing) {
				return {
					result: { ok: true as const, type: undefined },
					created: false,
					removed: false,
				};
			}
			await tx.reaction.delete({ where: { id: existing.id } });
			await tx.user.update({
				where: { id: userId },
				data: { totalReactions: { decrement: 1 } },
			});
			await bumpTargetTotals(tx, target, -1);
			return {
				result: { ok: true as const, type: undefined },
				created: false,
				removed: true,
			};
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
			return {
				result: { ok: true as const, type: input.type },
				created: true,
				removed: false,
			};
		}

		if (existing.type === input.type) {
			await tx.reaction.delete({ where: { id: existing.id } });
			await tx.user.update({
				where: { id: userId },
				data: { totalReactions: { decrement: 1 } },
			});
			await bumpTargetTotals(tx, target, -1);
			return {
				result: { ok: true as const, type: undefined },
				created: false,
				removed: true,
			};
		}

		await tx.reaction.update({
			where: { id: existing.id },
			data: { type: input.type },
		});
		return {
			result: { ok: true as const, type: input.type },
			created: false,
			removed: false,
		};
	});

	// Fire-and-forget reaction email when a *new* reaction lands on a post.
	// Skip toggle-off and type-change. Comment reactions don't send emails
	// (post owner email is the only configured target for v26.05.06).
	if (result.created && postId) {
		void notifyReactionEmail({ postId, actorUserId: userId }).catch((err) => {
			console.error("[setReaction] notifyReactionEmail", err);
		});
	}

	// In-app notification for the post / comment owner. Burst dedupe inside
	// the dispatcher collapses heart-toggle spam into a single feed row.
	if (result.created) {
		void notifyReaction({
			postId: postId ?? undefined,
			commentId: commentId ?? undefined,
			actorUserId: userId,
		}).catch((err) => {
			console.error("[setReaction] notifyReaction in-app", err);
		});
	}

	// Toggle-off (or clicking the same emoji to clear) — delete the
	// owner's unseen notification so they don't see a phantom reaction.
	if (result.removed) {
		void deleteReactionNotification({
			postId: postId ?? undefined,
			commentId: commentId ?? undefined,
			actorUserId: userId,
		}).catch((err) => {
			console.error("[setReaction] deleteReactionNotification", err);
		});
	}

	return result.result;
}

/**
 * Paginated list of reactors on a post or comment, newest reaction first.
 * Optionally filtered to a single reaction type so the breakdown dialog can
 * show "who clapped this :heart:".
 */
export async function listReactors(
	input: ListReactorsInputType,
): Promise<ListReactorsOutputType> {
	const pag = defineCursorPagination(input, input.limit);
	const cursorArgs = pag.use("id");

	const where: Prisma.ReactionWhereInput = {};
	if (input.postId) where.postId = input.postId;
	if (input.commentId) where.commentId = input.commentId;
	if (input.type) where.type = input.type;

	const rows = await prisma.reaction.findMany({
		where,
		...cursorArgs,
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			type: true,
			createdAt: true,
			user: {
				select: { username: true, name: true, image: true },
			},
		},
	});

	const items = rows.map((row) => ({
		id: row.id,
		type: row.type,
		createdAt: row.createdAt,
		user: {
			username: row.user.username,
			name: row.user.name ?? "",
			image: row.user.image,
		},
	}));

	return pag.output(items, (r) => r.id);
}
