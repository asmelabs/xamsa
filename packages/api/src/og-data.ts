import prisma from "@xamsa/db";
import { getBadge, isBadgeId } from "@xamsa/utils/badges";

export interface PackOgPayload {
	name: string;
	description: string | null;
	authorName: string;
	authorUsername: string;
	totalPlays: number;
	averageRating: number;
	totalRatings: number;
	totalTopics: number;
	language: string;
}

export async function getPackOgData(
	slug: string,
): Promise<PackOgPayload | null> {
	const pack = await prisma.pack.findFirst({
		where: { slug, status: "published", visibility: "public" },
		select: {
			name: true,
			description: true,
			language: true,
			averageRating: true,
			totalPlays: true,
			totalRatings: true,
			_count: { select: { topics: true } },
			author: { select: { name: true, username: true } },
		},
	});
	if (!pack) {
		return null;
	}
	return {
		name: pack.name,
		description: pack.description,
		authorName: pack.author.name,
		authorUsername: pack.author.username,
		totalPlays: pack.totalPlays,
		averageRating: pack.averageRating,
		totalRatings: pack.totalRatings,
		totalTopics: pack._count.topics,
		language: pack.language,
	};
}

export interface TopicOgPayload {
	name: string;
	description: string | null;
	packName: string;
	authorName: string;
	authorUsername: string;
	questionCount: number;
}

export async function getTopicOgData(
	packSlug: string,
	topicSlug: string,
): Promise<TopicOgPayload | null> {
	const topic = await prisma.topic.findFirst({
		where: {
			slug: topicSlug,
			pack: {
				slug: packSlug,
				status: "published",
				visibility: "public",
			},
		},
		select: {
			name: true,
			description: true,
			_count: { select: { questions: true } },
			pack: {
				select: {
					name: true,
					author: { select: { name: true, username: true } },
				},
			},
		},
	});
	if (!topic) {
		return null;
	}
	return {
		name: topic.name,
		description: topic.description,
		packName: topic.pack.name,
		authorName: topic.pack.author.name,
		authorUsername: topic.pack.author.username,
		questionCount: topic._count.questions,
	};
}

export interface UserOgPayload {
	name: string;
	username: string;
	image: string | null;
	level: number;
	xp: number;
	elo: number;
	totalGames: number;
}

export async function getUserOgData(
	username: string,
): Promise<UserOgPayload | null> {
	const user = await prisma.user.findUnique({
		where: { username },
		select: {
			name: true,
			username: true,
			image: true,
			level: true,
			xp: true,
			elo: true,
			totalGamesPlayed: true,
			totalGamesHosted: true,
		},
	});
	if (!user) {
		return null;
	}
	return {
		name: user.name,
		username: user.username,
		image: user.image,
		level: user.level,
		xp: user.xp,
		elo: user.elo,
		totalGames: user.totalGamesPlayed + user.totalGamesHosted,
	};
}

export interface GameOgPayload {
	code: string;
	packName: string;
	status: string;
	playersCount: number;
}

export async function getGameOgData(
	code: string,
): Promise<GameOgPayload | null> {
	const game = await prisma.game.findUnique({
		where: { code },
		select: {
			code: true,
			status: true,
			pack: { select: { name: true } },
			_count: { select: { players: true } },
		},
	});
	if (!game) {
		return null;
	}
	return {
		code: game.code,
		packName: game.pack.name,
		status: game.status,
		playersCount: game._count.players,
	};
}

export interface LeaderboardOgRow {
	rank: 1 | 2 | 3;
	name: string;
	username: string;
	image: string | null;
	elo: number;
}

const MIN_GAMES_PLAYED_ELO = 1;

export async function getLeaderboardOgData(): Promise<LeaderboardOgRow[]> {
	const rows = await prisma.user.findMany({
		where: { totalGamesPlayed: { gte: MIN_GAMES_PLAYED_ELO } },
		orderBy: [
			{ elo: "desc" },
			{ peakElo: "desc" },
			{ totalWins: "desc" },
			{ username: "asc" },
		],
		take: 3,
		select: {
			name: true,
			username: true,
			image: true,
			elo: true,
		},
	});
	return rows.map((r, i) => ({
		rank: (i + 1) as 1 | 2 | 3,
		name: r.name,
		username: r.username,
		image: r.image,
		elo: r.elo,
	}));
}

export interface PostOgPayload {
	bodyPreview: string | null;
	authorName: string;
	authorUsername: string;
	hasImage: boolean;
	reactionCount: number;
	commentCount: number;
}

export async function getPostOgData(
	slug: string,
): Promise<PostOgPayload | null> {
	const post = await prisma.post.findFirst({
		where: { slug },
		select: {
			body: true,
			image: true,
			totalComments: true,
			totalReactions: true,
			author: { select: { name: true, username: true } },
		},
	});
	if (!post) {
		return null;
	}
	const raw = post.body?.trim();
	const bodyPreview =
		raw && raw.length > 0
			? raw.length > 220
				? `${raw.slice(0, 219)}…`
				: raw
			: null;
	return {
		bodyPreview,
		authorName: post.author.name,
		authorUsername: post.author.username,
		hasImage: post.image != null && post.image.length > 0,
		reactionCount: post.totalReactions,
		commentCount: post.totalComments,
	};
}

export interface BadgeAwardOgPayload {
	badgeId: string;
	badgeName: string;
	badgeDescription: string;
	username: string;
	displayName: string;
	packName: string;
	gameCode: string;
	earnedAtIso: string;
}

export async function getBadgeAwardOgData(
	awardId: string,
): Promise<BadgeAwardOgPayload | null> {
	const award = await prisma.playerBadgeAward.findUnique({
		where: { id: awardId },
		select: {
			badgeId: true,
			earnedAt: true,
			player: {
				select: {
					user: { select: { username: true, name: true } },
					game: {
						select: {
							code: true,
							pack: { select: { name: true } },
						},
					},
				},
			},
		},
	});
	if (!award || !isBadgeId(award.badgeId)) return null;

	const badge = getBadge(award.badgeId);
	const displayName =
		award.player.user.name?.trim() || award.player.user.username;

	return {
		badgeId: badge.id,
		badgeName: badge.name,
		badgeDescription: badge.description,
		username: award.player.user.username,
		displayName,
		packName: award.player.game.pack.name,
		gameCode: award.player.game.code,
		earnedAtIso: award.earnedAt.toISOString(),
	};
}
