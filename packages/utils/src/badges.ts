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

export const BADGE_RARITIES = [
	"common", // earned in most games
	"uncommon", // takes some skill or play
	"rare", // meaningful accomplishment
	"legendary", // show-off tier
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
	rarity: BadgeRarity;
};

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
		rarity: "rare",
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
		rarity: "rare",
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
		rarity: "uncommon",
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
		rarity: "uncommon",
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
		rarity: "uncommon",
	},
} as const satisfies Record<string, Badge>;

export type BadgeId = keyof typeof badges;

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
	rarity?: BadgeRarity;
}): Badge[] {
	return Object.values(badges).filter((badge) => {
		if (filters.period && badge.period !== filters.period) return false;
		if (filters.type && badge.type !== filters.type) return false;
		if (filters.category && badge.category !== filters.category) return false;
		if (filters.assignment && badge.assignment !== filters.assignment)
			return false;
		if (filters.rarity && badge.rarity !== filters.rarity) return false;
		return true;
	});
}
