import type { BadgeOgData } from "./templates/badge";
import type { GameOgData } from "./templates/game";
import type { LeaderboardOgData } from "./templates/leaderboard";
import type { PackOgData } from "./templates/pack";
import type { ReleaseOgData } from "./templates/release";
import type { TopicOgData } from "./templates/topic";
import type { UserOgData } from "./templates/user";

/** Route segment under `/api/dev/og-preview/{kind}/og.png`. */
export const OG_PREVIEW_KINDS = [
	"play",
	"join",
	"leaderboard",
	"pack",
	"topic",
	"user",
	"game",
	"badge",
	"release",
] as const;

export type OgPreviewKind = (typeof OG_PREVIEW_KINDS)[number];

export function isOgPreviewKind(s: string): s is OgPreviewKind {
	return (OG_PREVIEW_KINDS as readonly string[]).includes(s);
}

export const mockPackOg: PackOgData = {
	name: "World capitals & landmarks",
	description:
		"From Paris to Ulaanbaatar — a tour of capitals, flags, and famous skylines for your next live night.",
	authorName: "Alex Rivera",
	authorUsername: "alexquiz",
	totalPlays: 12_482,
	averageRating: 4.7,
	totalRatings: 328,
	totalTopics: 24,
	language: "English",
};

export const mockTopicOg: TopicOgData = {
	name: "European capitals deep cut",
	description:
		"Twenty questions on EU institutions, microstates, and the cities that host them.",
	packName: "World capitals & landmarks",
	authorName: "Alex Rivera",
	authorUsername: "alexquiz",
	questionCount: 20,
};

export const mockUserOg: UserOgData = {
	name: "Jamie Chen",
	username: "jamiechen",
	image: null,
	level: 42,
	xp: 125_400,
	elo: 1842,
	totalGames: 156,
};

export const mockGameOg: GameOgData = {
	code: "XK7M2Q",
	packName: "World capitals & landmarks",
	statusLabel: "Live",
	playersCount: 8,
};

export const mockBadgeOg: BadgeOgData = {
	id: "first-win",
	name: "First victory",
	description:
		"Win your first completed live game as a player. The host still gets bragging rights.",
};

export const mockReleaseOg: ReleaseOgData = {
	versionLabel: "26.4.0",
	title: "Smarter recap, faster packs, and polish across the board.",
	releasedAt: "27 Apr 2026",
};

export const mockLeaderboardOg: LeaderboardOgData = {
	board: "elo",
	top: [
		{
			rank: 1,
			name: "Sam Okonkwo",
			username: "samok",
			image: null,
			elo: 2156,
		},
		{
			rank: 2,
			name: "Morgan Lee",
			username: "morganl",
			image: null,
			elo: 2088,
		},
		{
			rank: 3,
			name: "Riya Patel",
			username: "riyap",
			image: null,
			elo: 2041,
		},
	],
};

export const OG_PREVIEW_LABELS: Record<OgPreviewKind, string> = {
	play: "Play landing",
	join: "Join landing",
	leaderboard: "Leaderboard",
	pack: "Pack",
	topic: "Topic",
	user: "User profile",
	game: "Live game",
	badge: "Badge",
	release: "What’s new",
};

/** Short copy for the dev preview lightbox (what this OG represents in production). */
export const OG_PREVIEW_DESCRIPTIONS: Record<OgPreviewKind, string> = {
	play: "Static marketing card for /play — host or join flow overview.",
	join: "Static marketing card for /join — room code entry.",
	leaderboard: "Top 3 global Elo podium; production uses live API data.",
	pack: "Published pack card — title, author, stats, and rating from mocks.",
	topic: "Single topic inside a pack — questions count and pack context.",
	user: "Player profile — avatar, level, XP, Elo, games played.",
	game: "Active or waiting game room — code, pack name, status, player count.",
	badge: "Achievement detail — name and description for a badge page.",
	release: "What’s new entry — version label, title line, and release date.",
};
