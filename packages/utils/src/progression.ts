/**
 * Shared XP rules for game finalization and pack publish rewards.
 * Level numbers come from the table in `./levels` (single source of truth).
 */

import { getLevelFromXp as getLevelFromXpTable } from "./levels";

export {
	calculateEloDeltas,
	type CalculateEloDeltasOptions,
	type EloPlayerRow,
} from "./elo";
export {
	getLevelFromXp,
	getLevelProgress,
	getXpThreshold,
	LEVEL_DEFINITIONS,
	MAX_LEVEL,
	type LevelProgress,
} from "./levels";

/** @deprecated Use `getLevelFromXp` from `@xamsa/utils/levels` */
export function computeLevelFromXp(xp: number): number {
	return getLevelFromXpTable(xp);
}

/** XP granted to the host when a game is completed normally (not force-abandoned). */
export const HOST_FULL_GAME_COMPLETION_XP_BONUS = 100;

/**
 * Per-player XP from a finished game: score-based with podium bonuses.
 */
export function computeGamePlayerXpDelta(rank: number, score: number): number {
	const clamped = Math.max(0, score);
	if (rank === 1) return clamped + 200;
	if (rank <= 3) return clamped + 100;
	return clamped;
}
