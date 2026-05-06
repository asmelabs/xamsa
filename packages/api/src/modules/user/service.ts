import { ORPCError } from "@orpc/server";
import prisma from "@xamsa/db";
import { env } from "@xamsa/env/server";
import { sendNewFollowerEmail } from "@xamsa/mail/notifications";
import type {
	FindOneProfileInputType,
	FindOneProfileOutputType,
	FollowUserInputType,
	FollowUserOutputType,
	GetActiveGameOutputType,
	GetEloHistoryInputType,
	GetEloHistoryOutputType,
	GetFollowStateInputType,
	GetFollowStateOutputType,
	GetMyStatsOutputType,
	GetPublicGameActivityInputType,
	GetPublicGameActivityOutputType,
	GetPublicRecentGamesInputType,
	GetPublicRecentGamesOutputType,
	GetPublicStatsInputType,
	GetPublicStatsOutputType,
	GetRecentGamesInputType,
	GetRecentGamesOutputType,
	ListFollowersInputType,
	ListFollowersOutputType,
	ListFollowingInputType,
	ListFollowingOutputType,
	MentionCandidatesInputType,
	MentionCandidatesOutputType,
	RecentGameRow,
	RemoveUserAvatarOutputType,
	SetUserAvatarInputType,
	SetUserAvatarOutputType,
	UnfollowUserInputType,
	UnfollowUserOutputType,
	UpdateProfileInputType,
	UpdateProfileOutputType,
} from "@xamsa/schemas/modules/user";
import {
	destroyImageByPublicId,
	extractPublicIdFromDeliveryUrl,
	getUserAvatarPublicId,
	isManagedProfileImageUrl,
	uploadProfileImage,
} from "@xamsa/upload";
import { deleteFollowNotification } from "../notification/delete";
import { notifyFollow } from "../notification/dispatchers";
import { shouldSendCategoryEmail } from "../notification/email-gate";

export async function findOneProfile(
	input: FindOneProfileInputType,
): Promise<FindOneProfileOutputType> {
	/** Prefer live counts: `total_*` columns can drift when `user_follow` rows are CASCADE-deleted with a related user — those deletes do not decrement denormalized totals. */
	const row = await prisma.user.findUnique({
		where: {
			username: input.username,
		},
		select: {
			username: true,
			name: true,
			image: true,
			role: true,
			xp: true,
			level: true,
			elo: true,
			peakElo: true,
			lowestElo: true,
			_count: {
				select: {
					followers: true,
					following: true,
				},
			},
		},
	});

	if (!row) {
		throw new ORPCError("NOT_FOUND", {
			message: "Profile not found",
		});
	}

	const { _count, ...rest } = row;
	return {
		...rest,
		totalFollowers: _count.followers,
		totalFollowing: _count.following,
	};
}

export async function updateProfile(
	input: UpdateProfileInputType,
	userId: string,
): Promise<UpdateProfileOutputType> {
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "You are not authorized to update this profile",
		});
	}

	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data: input,
		select: {
			username: true,
		},
	});

	return updatedUser;
}

export async function setUserAvatar(
	input: SetUserAvatarInputType,
	userId: string,
): Promise<SetUserAvatarOutputType> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, image: true, username: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "You are not authorized to update this profile",
		});
	}

	const publicId = getUserAvatarPublicId(user.username);
	let buffer: Buffer;
	try {
		buffer = Buffer.from(input.imageBase64, "base64");
	} catch {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid image data",
		});
	}

	if (buffer.byteLength === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Invalid image data",
		});
	}

	const oldUrl = user.image ?? null;

	let secureUrl: string;
	try {
		({ secureUrl } = await uploadProfileImage({
			buffer,
			mimeType: input.mimeType,
			publicId,
		}));
	} catch (e) {
		const message =
			e instanceof Error ? e.message : "Could not upload profile image";
		throw new ORPCError("BAD_REQUEST", { message });
	}

	await prisma.user.update({
		where: { id: userId },
		data: { image: secureUrl },
	});

	if (oldUrl && isManagedProfileImageUrl(oldUrl)) {
		const oldPid = extractPublicIdFromDeliveryUrl(
			oldUrl,
			env.CLOUDINARY_CLOUD_NAME,
		);
		if (oldPid && oldPid !== publicId) {
			try {
				await destroyImageByPublicId(oldPid);
			} catch (cleanupErr) {
				console.error("[setUserAvatar] cloudinary cleanup:", cleanupErr);
			}
		}
	}

	return { image: secureUrl };
}

export async function removeUserAvatar(
	userId: string,
): Promise<RemoveUserAvatarOutputType> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, image: true, username: true },
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "You are not authorized to update this profile",
		});
	}

	const avatarPublicId = getUserAvatarPublicId(user.username);

	try {
		await destroyImageByPublicId(avatarPublicId);
	} catch (e) {
		console.error("[removeUserAvatar] cloudinary destroy:", e);
	}

	if (user.image && isManagedProfileImageUrl(user.image)) {
		const storedPid = extractPublicIdFromDeliveryUrl(
			user.image,
			env.CLOUDINARY_CLOUD_NAME,
		);
		if (storedPid && storedPid !== avatarPublicId) {
			try {
				await destroyImageByPublicId(storedPid);
			} catch (cleanupErr) {
				console.error("[removeUserAvatar] extra cleanup:", cleanupErr);
			}
		}
	}

	await prisma.user.update({
		where: { id: userId },
		data: { image: null },
	});

	return { image: null };
}

export async function getActiveGame(
	userId: string,
): Promise<GetActiveGameOutputType | null> {
	const activeGame = await prisma.game.findFirst({
		where: {
			status: { not: "completed" }, // only active or waiting games
			OR: [
				{ hostId: userId },
				{
					players: {
						some: { userId, status: { not: "left" } },
					},
				},
			],
		},
		select: {
			code: true,
			status: true,
			host: {
				select: {
					id: true,
				},
			},
			players: {
				where: {
					userId,
				},
				select: {
					id: true,
					nickname: true,
					score: true,
					rank: true,
					userId: true,
					status: true,
				},
			},
		},
	});

	if (!activeGame) return null;

	const { code, host, players, status } = activeGame;

	const player = players.find((player) => player.userId === userId);
	const isHost = host.id === userId;

	if (isHost) {
		return {
			code,
			status,
			isHost,
		};
	}

	if (player) {
		return {
			code,
			status,
			isHost: false,
			player: {
				status: player.status,
				nickname: player.nickname,
				score: player.score,
				rank: player.rank,
			},
		};
	}

	throw new ORPCError("INTERNAL_SERVER_ERROR", {
		message: "Something went wrong while fetching your active game",
	});
}

function ratio(num: number, den: number): number | null {
	if (!den || den <= 0) return null;
	return num / den;
}

/**
 * Returns the handful of user-level aggregates rendered on the home
 * dashboard stats strip and the profile Stats tab. Includes a `derived`
 * block of pre-computed ratios so the UI doesn't repeat divide-by-zero
 * guards everywhere.
 */
export async function getMyStats(
	userId: string,
): Promise<GetMyStatsOutputType> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			level: true,
			xp: true,
			elo: true,
			peakElo: true,
			lowestElo: true,
			totalGamesPlayed: true,
			totalGamesHosted: true,
			totalWins: true,
			totalPodiums: true,
			totalPointsEarned: true,
			totalCorrectAnswers: true,
			totalIncorrectAnswers: true,
			totalExpiredAnswers: true,
			totalFirstClicks: true,
			totalLastPlaces: true,
			totalTopicsPlayed: true,
			totalQuestionsPlayed: true,
			totalTimeSpentPlaying: true,
			totalTimeSpentHosting: true,
			totalPacksPublished: true,
		},
	});

	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "User not found",
		});
	}

	const totalAnswers =
		user.totalCorrectAnswers +
		user.totalIncorrectAnswers +
		user.totalExpiredAnswers;
	const derived = {
		correctAnswerRate: ratio(user.totalCorrectAnswers, totalAnswers),
		firstClickRate: ratio(user.totalFirstClicks, user.totalQuestionsPlayed),
		pointsPerGame: ratio(user.totalPointsEarned, user.totalGamesPlayed),
		winRate: ratio(user.totalWins, user.totalGamesPlayed),
		podiumRate: ratio(user.totalPodiums, user.totalGamesPlayed),
		avgPlayMinutes: ratio(
			user.totalTimeSpentPlaying / 60,
			user.totalGamesPlayed,
		),
		avgHostMinutes: ratio(
			user.totalTimeSpentHosting / 60,
			user.totalGamesHosted,
		),
		avgQuestionsPerGame: ratio(
			user.totalQuestionsPlayed,
			user.totalGamesPlayed,
		),
	};

	return { ...user, derived };
}

/**
 * Per-game Elo history (snapshots persisted on `Player` during finalizeGame).
 * Returns the most recent N rows so charts can plot them oldest-to-newest.
 */
export async function getEloHistory(
	input: GetEloHistoryInputType,
): Promise<GetEloHistoryOutputType> {
	const userId = await requireUserIdByUsername(input.username);
	const rows = await prisma.player.findMany({
		where: {
			userId,
			eloDelta: { not: null },
			eloRatingBefore: { not: null },
			eloRatingAfter: { not: null },
			game: {
				status: "completed",
				finishedAt: { not: null },
			},
		},
		select: {
			eloRatingBefore: true,
			eloRatingAfter: true,
			eloDelta: true,
			rank: true,
			score: true,
			game: {
				select: {
					id: true,
					code: true,
					finishedAt: true,
					pack: { select: { slug: true, name: true } },
				},
			},
		},
		orderBy: { game: { finishedAt: "desc" } },
		take: input.limit,
	});

	const items: GetEloHistoryOutputType["items"] = rows.map((r) => ({
		gameId: r.game.id,
		gameCode: r.game.code,
		finishedAt: r.game.finishedAt as Date,
		packSlug: r.game.pack.slug,
		packName: r.game.pack.name,
		rank: r.rank ?? null,
		score: r.score,
		// Non-null filtered above.
		ratingBefore: r.eloRatingBefore as number,
		ratingAfter: r.eloRatingAfter as number,
		delta: r.eloDelta as number,
	}));

	return { items };
}

/**
 * Returns the signed-in user's recent finished games (both as host and as
 * player), ordered by finishedAt desc. Cursor pagination uses the Game.id of
 * the last row from the previous page; we fetch `limit + 1` and use the
 * extra row to compute `nextCursor`.
 *
 * Only `status: "completed"` games with a non-null `finishedAt` and a
 * non-null `startedAt` surface — i.e. sessions that actually started. Lobby
 * cancels (completed without `startedAt`) are excluded, along with anything
 * still active, deleted, or never finalized.
 */
export async function getRecentGames(
	input: GetRecentGamesInputType,
	userId: string,
): Promise<GetRecentGamesOutputType> {
	const limit = input.limit;

	const rows = await prisma.game.findMany({
		where: {
			status: "completed",
			finishedAt: { not: null },
			startedAt: { not: null },
			OR: [{ hostId: userId }, { players: { some: { userId } } }],
		},
		orderBy: [{ finishedAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		select: {
			id: true,
			code: true,
			finishedAt: true,
			durationSeconds: true,
			hostId: true,
			winnerId: true,
			pack: { select: { slug: true, name: true } },
			players: {
				select: {
					id: true,
					userId: true,
					rank: true,
					score: true,
					user: { select: { name: true } },
				},
			},
		},
	});

	const hasNext = rows.length > limit;
	const pageRows = hasNext ? rows.slice(0, limit) : rows;

	const items: RecentGameRow[] = pageRows.map((game) => {
		const isHost = game.hostId === userId;
		const me = game.players.find((p) => p.userId === userId) ?? null;
		const winner = game.winnerId
			? (game.players.find((p) => p.id === game.winnerId) ?? null)
			: null;

		return {
			code: game.code,
			finishedAt: game.finishedAt as Date,
			durationSeconds: game.durationSeconds,
			pack: game.pack,
			totalPlayers: game.players.length,
			role: isHost ? "host" : "player",
			myRank: me?.rank ?? null,
			myScore: me?.score,
			winnerName: winner?.user.name ?? null,
		};
	});

	const nextCursor =
		hasNext && pageRows.length > 0
			? (pageRows[pageRows.length - 1]?.id ?? null)
			: null;

	return { items, nextCursor };
}

export async function requireUserIdByUsername(
	username: string,
): Promise<string> {
	const user = await prisma.user.findUnique({
		where: { username },
		select: { id: true },
	});
	if (!user) {
		throw new ORPCError("NOT_FOUND", {
			message: "Profile not found",
		});
	}
	return user.id;
}

export async function getPublicStats(
	input: GetPublicStatsInputType,
): Promise<GetPublicStatsOutputType> {
	const userId = await requireUserIdByUsername(input.username);
	return getMyStats(userId);
}

/** Max rows scanned to bucket finished games by month (profile activity chart). */
const PUBLIC_GAME_ACTIVITY_GAME_CAP = 2000;

export async function getPublicGameActivity(
	input: GetPublicGameActivityInputType,
): Promise<GetPublicGameActivityOutputType> {
	const userId = await requireUserIdByUsername(input.username);
	const rows = await prisma.game.findMany({
		where: {
			status: "completed",
			finishedAt: { not: null },
			startedAt: { not: null },
			OR: [{ hostId: userId }, { players: { some: { userId } } }],
		},
		select: { finishedAt: true },
		orderBy: { finishedAt: "desc" },
		take: PUBLIC_GAME_ACTIVITY_GAME_CAP,
	});

	const countsByMonth = new Map<string, number>();
	for (const r of rows) {
		const d = r.finishedAt;
		if (!d) continue;
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
	}

	const months: GetPublicGameActivityOutputType["months"] = [];
	const now = new Date();
	for (let i = 11; i >= 0; i--) {
		const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
		const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
		months.push({ month: key, games: countsByMonth.get(key) ?? 0 });
	}

	return { months };
}

export async function getPublicRecentGames(
	input: GetPublicRecentGamesInputType,
): Promise<GetPublicRecentGamesOutputType> {
	const { username, ...pagination } = input;
	const userId = await requireUserIdByUsername(username);
	return getRecentGames(pagination, userId);
}

function isPrismaUniqueViolation(err: unknown): boolean {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		(err as { code: string }).code === "P2002"
	);
}

export async function getFollowState(
	input: GetFollowStateInputType,
	followerId: string,
	followerUsername: string,
): Promise<GetFollowStateOutputType> {
	if (input.username === followerUsername) {
		return { isFollowing: false };
	}
	const followingId = await requireUserIdByUsername(input.username);
	const row = await prisma.userFollow.findFirst({
		where: {
			followerId,
			followingId,
			status: "accepted",
		},
		select: { id: true },
	});
	return { isFollowing: row !== null };
}

export async function followUser(
	input: FollowUserInputType,
	followerId: string,
	followerUsername: string,
): Promise<FollowUserOutputType> {
	if (input.username === followerUsername) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You cannot follow yourself",
		});
	}

	const target = await prisma.user.findUnique({
		where: { username: input.username },
		select: { id: true },
	});

	if (!target) {
		throw new ORPCError("NOT_FOUND", {
			message: "Profile not found",
		});
	}

	let createdNewFollow = false;
	try {
		createdNewFollow = await prisma.$transaction(
			async (tx): Promise<boolean> => {
				const existing = await tx.userFollow.findUnique({
					where: {
						followerId_followingId: {
							followerId,
							followingId: target.id,
						},
					},
					select: { id: true },
				});
				if (existing) return false;

				await tx.userFollow.create({
					data: {
						followerId,
						followingId: target.id,
						status: "accepted",
					},
				});
				await tx.user.update({
					where: { id: followerId },
					data: { totalFollowing: { increment: 1 } },
				});
				await tx.user.update({
					where: { id: target.id },
					data: { totalFollowers: { increment: 1 } },
				});
				return true;
			},
		);
	} catch (err) {
		if (!isPrismaUniqueViolation(err)) throw err;
		createdNewFollow = false;
	}

	if (createdNewFollow) {
		try {
			const [follower, followee, allowEmail] = await Promise.all([
				prisma.user.findUnique({
					where: { id: followerId },
					select: { name: true, username: true },
				}),
				prisma.user.findUnique({
					where: { id: target.id },
					select: { email: true, name: true },
				}),
				shouldSendCategoryEmail({
					recipientUserId: target.id,
					actorUserId: followerId,
					category: "follow",
				}),
			]);
			if (allowEmail && follower && followee?.email) {
				await sendNewFollowerEmail({
					email: followee.email,
					name: followee.name,
					followerName: follower.name,
					followerUsername: follower.username,
				});
			}
		} catch (e) {
			console.error("[followUser email]", e);
		}

		void notifyFollow({
			recipientUserId: target.id,
			actorUserId: followerId,
		}).catch((err) => {
			console.error("[followUser] in-app notify", err);
		});
	}

	return { ok: true as const };
}

export async function unfollowUser(
	input: UnfollowUserInputType,
	followerId: string,
	followerUsername: string,
): Promise<UnfollowUserOutputType> {
	if (input.username === followerUsername) {
		throw new ORPCError("BAD_REQUEST", {
			message: "You cannot unfollow yourself",
		});
	}

	const target = await prisma.user.findUnique({
		where: { username: input.username },
		select: { id: true },
	});
	if (!target) {
		throw new ORPCError("NOT_FOUND", {
			message: "Profile not found",
		});
	}

	const removed = await prisma.$transaction(async (tx) => {
		const deleted = await tx.userFollow.deleteMany({
			where: {
				followerId,
				followingId: target.id,
				status: "accepted",
			},
		});
		if (deleted.count === 0) return false;

		await tx.user.update({
			where: { id: followerId },
			data: { totalFollowing: { decrement: 1 } },
		});
		await tx.user.update({
			where: { id: target.id },
			data: { totalFollowers: { decrement: 1 } },
		});
		return true;
	});

	if (removed) {
		void deleteFollowNotification({
			recipientUserId: target.id,
			actorUserId: followerId,
		}).catch((err) => {
			console.error("[unfollowUser] deleteFollowNotification", err);
		});
	}

	return { ok: true as const };
}

function displayNameOrUsername(name: string, username: string) {
	const t = name.trim();
	return t.length > 0 ? t : username;
}

export async function listFollowers(
	input: ListFollowersInputType,
	viewerId?: string | null,
): Promise<ListFollowersOutputType> {
	const limit = input.limit;
	const profileId = await requireUserIdByUsername(input.username);

	const rows = await prisma.userFollow.findMany({
		where: {
			followingId: profileId,
			status: "accepted",
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		select: {
			id: true,
			follower: {
				select: { id: true, username: true, name: true, image: true },
			},
		},
	});

	const hasNext = rows.length > limit;
	const pageRows = hasNext ? rows.slice(0, limit) : rows;

	const followedIdSet = viewerId
		? new Set(
				(
					await prisma.userFollow.findMany({
						where: {
							followerId: viewerId,
							followingId: {
								in: pageRows.map((r) => r.follower.id),
							},
							status: "accepted",
						},
						select: { followingId: true },
					})
				).map((f) => f.followingId),
			)
		: null;

	const items = pageRows.map((r) => ({
		username: r.follower.username,
		name: displayNameOrUsername(r.follower.name, r.follower.username),
		image: r.follower.image,
		viewerFollows: followedIdSet?.has(r.follower.id) ?? false,
	}));

	const nextCursor =
		hasNext && pageRows.length > 0
			? (pageRows[pageRows.length - 1]?.id ?? null)
			: null;

	return { items, nextCursor };
}

export async function listFollowing(
	input: ListFollowingInputType,
	viewerId?: string | null,
): Promise<ListFollowingOutputType> {
	const limit = input.limit;
	const profileId = await requireUserIdByUsername(input.username);

	const rows = await prisma.userFollow.findMany({
		where: {
			followerId: profileId,
			status: "accepted",
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		take: limit + 1,
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
		select: {
			id: true,
			following: {
				select: { id: true, username: true, name: true, image: true },
			},
		},
	});

	const hasNext = rows.length > limit;
	const pageRows = hasNext ? rows.slice(0, limit) : rows;

	const followedIdSet = viewerId
		? new Set(
				(
					await prisma.userFollow.findMany({
						where: {
							followerId: viewerId,
							followingId: {
								in: pageRows.map((r) => r.following.id),
							},
							status: "accepted",
						},
						select: { followingId: true },
					})
				).map((f) => f.followingId),
			)
		: null;

	const items = pageRows.map((r) => ({
		username: r.following.username,
		name: displayNameOrUsername(r.following.name, r.following.username),
		image: r.following.image,
		viewerFollows: followedIdSet?.has(r.following.id) ?? false,
	}));

	const nextCursor =
		hasNext && pageRows.length > 0
			? (pageRows[pageRows.length - 1]?.id ?? null)
			: null;

	return { items, nextCursor };
}

export async function mentionCandidates(
	input: MentionCandidatesInputType,
	sessionUserId: string,
): Promise<MentionCandidatesOutputType> {
	const prefix = input.prefix.trim().toLowerCase();
	const limit = input.limit;

	if (prefix.length < 1) {
		const following = await prisma.userFollow.findMany({
			where: { followerId: sessionUserId, status: "accepted" },
			take: limit,
			orderBy: { createdAt: "desc" },
			select: { following: { select: { username: true, name: true } } },
		});
		let items = following.map((f) => f.following);
		const seen = new Set(items.map((i) => i.username));

		if (items.length < limit) {
			const followers = await prisma.userFollow.findMany({
				where: {
					followingId: sessionUserId,
					status: "accepted",
				},
				take: limit * 2,
				orderBy: { createdAt: "desc" },
				select: { follower: { select: { username: true, name: true } } },
			});
			for (const f of followers) {
				if (items.length >= limit) {
					break;
				}
				const u = f.follower;
				if (!seen.has(u.username)) {
					seen.add(u.username);
					items.push(u);
				}
			}
		}

		if (items.length < limit) {
			const fill = await prisma.user.findMany({
				where: {
					NOT: { id: sessionUserId },
					...(seen.size > 0 ? { username: { notIn: [...seen] } } : {}),
				},
				take: limit - items.length,
				orderBy: { username: "asc" },
				select: { username: true, name: true },
			});
			items = [...items, ...fill];
		}

		return { items };
	}

	const rows = await prisma.user.findMany({
		where: {
			username: { startsWith: prefix },
			NOT: { id: sessionUserId },
		},
		take: limit,
		orderBy: { username: "asc" },
		select: { username: true, name: true },
	});

	return { items: rows };
}
