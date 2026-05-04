import type { Prisma } from "@xamsa/db";
import { extractMentionUsernames } from "@xamsa/utils/mentions";

export async function insertMentionsForPost(
	tx: Prisma.TransactionClient,
	params: { postId: string; body: string | null; createdByUserId: string },
): Promise<string[]> {
	const names = extractMentionUsernames(params.body ?? "");
	if (names.length === 0) {
		return [];
	}

	const users = await tx.user.findMany({
		where: { username: { in: names } },
		select: { id: true },
	});

	const ids = [
		...new Set(
			users.map((u) => u.id).filter((id) => id !== params.createdByUserId),
		),
	];
	if (ids.length === 0) {
		return [];
	}

	await tx.mention.createMany({
		data: ids.map((mentionedUserId) => ({
			mentionedUserId,
			createdByUserId: params.createdByUserId,
			postId: params.postId,
			commentId: null,
		})),
	});

	return ids;
}

export async function insertMentionsForCommentOnPost(
	tx: Prisma.TransactionClient,
	params: {
		commentId: string;
		postId: string;
		body: string;
		createdByUserId: string;
	},
): Promise<string[]> {
	const names = extractMentionUsernames(params.body);
	if (names.length === 0) {
		return [];
	}

	const users = await tx.user.findMany({
		where: { username: { in: names } },
		select: { id: true },
	});

	const ids = [
		...new Set(
			users.map((u) => u.id).filter((id) => id !== params.createdByUserId),
		),
	];
	if (ids.length === 0) {
		return [];
	}

	await tx.mention.createMany({
		data: ids.map((mentionedUserId) => ({
			mentionedUserId,
			createdByUserId: params.createdByUserId,
			postId: null,
			commentId: params.commentId,
		})),
	});

	return ids;
}
