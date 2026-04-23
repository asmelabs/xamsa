/**
 * Single source of truth for XP tiers (app-level). DB `User.level` must match
 * `getLevelFromXp(user.xp)` whenever XP is mutated.
 *
 * Curve: each level requires more XP than the last (superlinear step size).
 */

export const MAX_LEVEL = 60;

const TIER_NAMES = [
	"Novice",
	"Apprentice",
	"Contender",
	"Challenger",
	"Expert",
	"Veteran",
	"Elite",
	"Master",
	"Grandmaster",
	"Champion",
	"Legend",
	"Immortal",
] as const;

function nameForLevel(level: number): string {
	const tierIdx = Math.min(Math.floor((level - 1) / 5), TIER_NAMES.length - 1);
	const subtier = ((level - 1) % 5) + 1;
	const tier = TIER_NAMES[tierIdx] ?? "Immortal";
	return `${tier} ${subtier}`;
}

function buildLevelDefinitions(): {
	level: number;
	minXp: number;
	name: string;
}[] {
	const defs: { level: number; minXp: number; name: string }[] = [];
	let minXp = 0;
	for (let level = 1; level <= MAX_LEVEL; level++) {
		defs.push({ level, minXp, name: nameForLevel(level) });
		if (level < MAX_LEVEL) {
			// Widening steps: later levels cost more XP per tier.
			minXp += Math.floor(450 * level ** 1.45);
		}
	}
	return defs;
}

/** Immutable table: index `level - 1`. */
export const LEVEL_DEFINITIONS = buildLevelDefinitions();

/**
 * Minimum total XP required to **be** this level (level 1 starts at 0).
 */
export function getXpThreshold(level: number): number {
	if (level < 1) return 0;
	if (level > MAX_LEVEL) {
		return LEVEL_DEFINITIONS[MAX_LEVEL - 1]?.minXp ?? 0;
	}
	return LEVEL_DEFINITIONS[level - 1]?.minXp ?? 0;
}

/**
 * Current level number (1..MAX_LEVEL) for a total XP amount.
 */
export function getLevelFromXp(xp: number): number {
	const x = Math.max(0, xp);
	for (let L = MAX_LEVEL; L >= 1; L--) {
		const min = LEVEL_DEFINITIONS[L - 1]?.minXp ?? 0;
		if (x >= min) return L;
	}
	return 1;
}

export type LevelProgress = {
	level: number;
	name: string;
	/** XP counted from the start of this level. */
	xpIntoLevel: number;
	/** XP needed to finish this level (0 if max level). */
	xpForCurrentLevel: number;
	/** 0..1 progress within this level; 1 at max level. */
	pct: number;
	isMaxLevel: boolean;
};

/**
 * Progress within the current level (for progress bars).
 */
export function getLevelProgress(xp: number): LevelProgress {
	const x = Math.max(0, xp);
	const level = getLevelFromXp(x);
	const def = LEVEL_DEFINITIONS[level - 1];
	const name = def?.name ?? `Tier ${level}`;
	const minCurrent = def?.minXp ?? 0;
	const xpIntoLevel = x - minCurrent;

	if (level >= MAX_LEVEL) {
		return {
			level,
			name,
			xpIntoLevel,
			xpForCurrentLevel: 0,
			pct: 1,
			isMaxLevel: true,
		};
	}

	const minNext = LEVEL_DEFINITIONS[level]?.minXp ?? minCurrent;
	const xpForCurrentLevel = minNext - minCurrent;
	const pct =
		xpForCurrentLevel > 0
			? Math.min(1, Math.max(0, xpIntoLevel / xpForCurrentLevel))
			: 1;

	return {
		level,
		name,
		xpIntoLevel,
		xpForCurrentLevel,
		pct,
		isMaxLevel: false,
	};
}
