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
	ListPostsInputType,
	ListPostsOutputType,
	PostAttachmentRowType,
	PostReactionByTypeType,
	PostRowType,
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

function sortedReactionsByTypeFromGrouped(
	items: readonly { type: ReactionEmoji; count: number }[],
): PostReactionByTypeType[] {
	return [...items]
		.filter(({ count }) => count > 0)
		.sort((a, b) =>
			b.count !== a.count ? b.count - a.count : a.type.localeCompare(b.type),
		);
}

async function toPostRow(
	p: PostWithRelations,
	myReactionType?: ReactionEmoji | null,
	reactionsByType: readonly PostReactionByTypeType[] = [],
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
		author: p.author,
		attachment: attachmentRow,
		myReactionType: myReactionType ?? undefined,
		reactionsByType: [...reactionsByType],
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
		const created = await prisma.$transaction(async (tx) => {
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

			return tx.post.findUniqueOrThrow({
				where: { id: postId },
				include: { author: FEED_AUTHOR, attachment: true },
			});
		});

		return toPostRow(created, null, []);
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

	const rows = await prisma.post.findMany({
		where:
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
				: {},
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

	const items = await Promise.all(
		page.map((p) =>
			toPostRow(
				p as PostWithRelations,
				reactionByPost.get(p.id) ?? null,
				sortedReactionsByTypeFromGrouped(breakdownByPostId.get(p.id) ?? []),
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
