export const BADGE_PERIODS = [
	"lifetime", // earned once across user's entire history
	"game", // earned at the end of a single game
	"topic", // earned at the end of a topic within a game
	"question", // earned on a specific question event
] as const;

export const BADGE_TYPES = [
	"answer", // related to correct/incorrect answers
	"buzz", // related to buzzing behavior (order, frequency)
	"speed", // related to reaction time
	"score", // related to points earned/lost
	"ranking", // related to final position in a game
	"participation", // related to playing/hosting/creating
	"streak", // related to consecutive events (correct/incorrect in a row)
	"milestone", // cumulative thresholds (1st game, 100 games, etc.)
	"social", // interactions with other players
] as const;

export const BADGE_CATEGORIES = [
	"skill", // celebrates good play
	"struggle", // humorous takes on poor play
	"moment", // specific circumstances came together
	"dedication", // rewarded for playing/creating a lot
	"creator", // rewarded for content creation
	"host", // rewarded for hosting well
	"discovery", // trying new things
] as const;

export const BADGE_ASSIGNMENTS = [
	"host", // earned by the host
	"player", // earned by a player
	"author", // earned by the pack author (separate from host since hosts can be non-authors in future)
] as const;

/**
 * Rarity tiers, computed at runtime from the share of *eligible* players who
 * own a badge. Predefined per-badge tiers were misleading once the catalog
 * grew (a badge marked `legendary` could become commonplace, and vice versa)
 * — we now derive these buckets from `uniqueEarners / totalEligibleUsers` in
 * `computeBadgeRarity`.
 */
export const BADGE_RARITIES = [
	"common", // earned by a large share of eligible players
	"uncommon", // earned by some players
	"rare", // earned by few
	"legendary", // earned by almost no one
] as const;

export type BadgePeriod = (typeof BADGE_PERIODS)[number];
export type BadgeType = (typeof BADGE_TYPES)[number];
export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];
export type BadgeAssignment = (typeof BADGE_ASSIGNMENTS)[number];
export type BadgeRarity = (typeof BADGE_RARITIES)[number];

export type Badge = {
	id: string;
	name: string;
	description: string;
	requirements: readonly string[];
	icon: string;
	color: string;
	period: BadgePeriod;
	type: BadgeType;
	category: BadgeCategory;
	assignment: BadgeAssignment;
};

import z from "zod";

export const badges = {
	ace: {
		id: "ace",
		name: "Ace",
		description:
			"Awarded to a player who answers all five questions of a topic correctly. The clean sweep — a perfect topic, no slip-ups, no missed buzzes that mattered.",
		requirements: [
			"Player must be in 'playing' status throughout the topic",
			"Player must have exactly 5 correct answers in the topic",
			"Player must have 0 incorrect answers in the topic",
			"Awarded at the moment the topic finishes (last question resolved)",
		],
		color: "gold",
		icon: "🎯",
		period: "topic",
		type: "answer",
		category: "skill",
		assignment: "player",
	},

	scavenger: {
		id: "scavenger",
		name: "Scavenger",
		description:
			"Awarded to a player who buzzes last in the queue, after every other buzzer has answered incorrectly, and walks away with the points. The leftovers turned into a feast.",
		requirements: [
			"Question must have at least 3 players who buzzed (otherwise it's not impressive enough)",
			"All players who buzzed before this player must have answered incorrectly",
			"This player must have the highest position number in the buzz queue at the moment of buzzing",
			"This player's answer must be marked correct",
			"Awarded at the moment the click is marked correct",
			"Can be earned multiple times per game (once per qualifying question)",
		],
		color: "purple",
		icon: "🦴",
		period: "question",
		type: "buzz",
		category: "moment",
		assignment: "player",
	},

	ghost: {
		id: "ghost",
		name: "Ghost",
		description:
			"Awarded to a player who plays through an entire topic without buzzing on a single question. Five questions came and went — and you watched them all pass.",
		requirements: [
			"Player must be in 'playing' status throughout the topic",
			"Player must have 0 buzzes (clicks) on any of the topic's 5 questions",
			"Topic must reach completion (last question resolved or skipped)",
			"Awarded at the moment the topic finishes",
		],
		color: "gray",
		icon: "👻",
		period: "topic",
		type: "buzz",
		category: "struggle",
		assignment: "player",
	},

	jackpot: {
		id: "jackpot",
		name: "Jackpot",
		description:
			"Awarded to a player who scores 1000 or more net points in a single topic. Five questions, big swings, and a wallet full of points at the end.",
		requirements: [
			"Player must be in 'playing' status throughout the topic",
			"Player's net point change in the topic (points awarded minus points deducted) must be 1000 or higher",
			"Awarded at the moment the topic finishes",
		],
		color: "gold",
		icon: "💰",
		period: "topic",
		type: "score",
		category: "skill",
		assignment: "player",
	},

	magnificent: {
		id: "magnificent",
		name: "Magnificent",
		description:
			"Awarded when you finish first on the scoreboard after a full game without a single incorrect buzz — every mistake avoided from buzz one to the last round.",
		requirements: [
			"Player must finish ranked first after standings tie-breakers",
			"Player’s aggregate incorrectAnswers for the game must be 0",
			"Awarded when the game is finalized",
		],
		color: "gold",
		icon: "✨",
		period: "game",
		type: "ranking",
		category: "skill",
		assignment: "player",
	},

	bankrupt: {
		id: "bankrupt",
		name: "Bankrupt",
		description:
			"Awarded to a player whose net score in a single topic is -500 or worse. Every wrong buzz dug the hole deeper. The topic ended; the damage didn't.",
		requirements: [
			"Player must be in 'playing' status throughout the topic",
			"Player's net point change in the topic (points awarded minus points deducted) must be -500 or lower",
			"Player must have at least 2 incorrect answers in the topic (otherwise it can't drop that low)",
			"Awarded at the moment the topic finishes",
		],
		color: "red",
		icon: "💸",
		period: "topic",
		type: "score",
		category: "struggle",
		assignment: "player",
	},

	abomination: {
		id: "abomination",
		name: "Abomination",
		description:
			"Awarded to a player who answers all five questions of a topic incorrectly — the inverse of an Ace. Five buzzes, five misses; the topic ends in flames.",
		requirements: [
			"Player must be in 'playing' status throughout the topic",
			"Player must have exactly 5 incorrect answers in the topic",
			"Player must have 0 correct answers in the topic",
			"Awarded at the moment the topic finishes (last question resolved)",
		],
		color: "red",
		icon: "👹",
		period: "topic",
		type: "answer",
		category: "struggle",
		assignment: "player",
	},

	genius: {
		id: "genius",
		name: "Genius",
		description:
			"Awarded when your net score is strictly positive in every topic of a finished game — every round paid off; nowhere did you tread water or sink.",
		requirements: [
			"The game must have at least one played topic (GameTopic rows)",
			"For each topic in the session, the player's net points on that topic (sum of click pointsAwarded) must be greater than zero",
			"Awarded when the game is finalized",
		],
		color: "gold",
		icon: "🧠",
		period: "game",
		type: "score",
		category: "skill",
		assignment: "player",
	},

	dunce: {
		id: "dunce",
		name: "Dunce",
		description:
			"Awarded when your net score is zero or negative in every topic of a finished game — every round was a slog or a silence; nowhere did you pull ahead.",
		requirements: [
			"The game must have at least one played topic (GameTopic rows)",
			"For each topic in the session, the player's net points on that topic must be zero or less",
			"Awarded when the game is finalized",
		],
		color: "gray",
		icon: "🎓",
		period: "game",
		type: "score",
		category: "struggle",
		assignment: "player",
	},

	dominator: {
		id: "dominator",
		name: "Dominator",
		description:
			"Awarded to a winner who finishes at least twice the runner-up's score on a competitive night — a clean lap of the field with room to spare.",
		requirements: [
			"Game must have at least 3 players (any status counted)",
			"Game must have at least 5 played topics (GameTopic rows)",
			"Player must finish ranked first after standings tie-breakers",
			"Winner's final score must be at least 2x the runner-up's score (with runner-up score > 0); a positive winner score over a non-positive runner-up also qualifies",
			"Awarded when the game is finalized",
		],
		color: "crimson",
		icon: "🏆",
		period: "game",
		type: "ranking",
		category: "skill",
		assignment: "player",
	},

	survivor: {
		id: "survivor",
		name: "Survivor",
		description:
			"Awarded to a winner who edges out second place by 500 points or fewer — the kind of finish you replay in your head for a week.",
		requirements: [
			"Game must have at least 3 players (any status counted)",
			"Game must have at least 5 played topics (GameTopic rows)",
			"Player must finish ranked first after standings tie-breakers",
			"Winner's final score must be at most 500 points ahead of the runner-up (margin between 0 and 500 inclusive)",
			"Awarded when the game is finalized",
		],
		color: "emerald",
		icon: "🛟",
		period: "game",
		type: "ranking",
		category: "moment",
		assignment: "player",
	},
} as const satisfies Record<string, Badge>;

export type BadgeId = keyof typeof badges;

/** Every catalog id; derived from `badges` keys. */
export const ALL_BADGE_IDS: readonly BadgeId[] = Object.keys(
	badges,
) as BadgeId[];

/**
 * `z.enum` tuple for the current catalog. Keep in sync with `badges` keys
 * (TypeScript will not infer a tuple from `Object.keys` alone).
 */
const BADGE_ID_ZOD_TUPLE = [
	"ace",
	"scavenger",
	"ghost",
	"jackpot",
	"magnificent",
	"bankrupt",
	"abomination",
	"genius",
	"dunce",
	"dominator",
	"survivor",
] as const;

export const BadgeIdSchema = z.enum(BADGE_ID_ZOD_TUPLE);

export function isBadgeId(id: string): id is BadgeId {
	return id in badges;
}

/**
 * Get badge metadata by id with full type safety.
 */
export function getBadge<T extends BadgeId>(id: T): (typeof badges)[T] {
	return badges[id];
}

/**
 * Filter badges by one or more criteria.
 */
export function filterBadges(filters: {
	period?: BadgePeriod;
	type?: BadgeType;
	category?: BadgeCategory;
	assignment?: BadgeAssignment;
}): Badge[] {
	return Object.values(badges).filter((badge) => {
		if (filters.period && badge.period !== filters.period) return false;
		if (filters.type && badge.type !== filters.type) return false;
		if (filters.category && badge.category !== filters.category) return false;
		if (filters.assignment && badge.assignment !== filters.assignment)
			return false;
		return true;
	});
}

/**
 * Bucket thresholds (share of *eligible* players who own the badge):
 *   < 2% → legendary
 *   < 10% → rare
 *   < 30% → uncommon
 *   ≥ 30% → common
 *
 * If `totalEligibleUsers` is 0 we cannot tell — treat the badge as `legendary`
 * (only happens on a fresh install).
 */
export const BADGE_RARITY_THRESHOLDS = {
	legendary: 0.02,
	rare: 0.1,
	uncommon: 0.3,
} as const;

export function computeBadgeRarity(
	uniqueEarners: number,
	totalEligibleUsers: number,
): BadgeRarity {
	if (totalEligibleUsers <= 0 || uniqueEarners <= 0) return "legendary";
	const share = uniqueEarners / totalEligibleUsers;
	if (share < BADGE_RARITY_THRESHOLDS.legendary) return "legendary";
	if (share < BADGE_RARITY_THRESHOLDS.rare) return "rare";
	if (share < BADGE_RARITY_THRESHOLDS.uncommon) return "uncommon";
	return "common";
}

/** Numeric rank for sorting (legendary first when ascending). */
export const BADGE_RARITY_RANK: Record<BadgeRarity, number> = {
	legendary: 0,
	rare: 1,
	uncommon: 2,
	common: 3,
};
