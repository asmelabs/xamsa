/**
 * Shared XP rules for game finalization and pack publish rewards.
 * Level numbers come from the table in `./levels` (single source of truth).
 */

import { getLevelFromXp as getLevelFromXpTable } from "./levels";

export {
	type CalculateEloDeltasOptions,
	calculateEloDeltas,
	type EloPlayerRow,
} from "./elo";
export {
	getLevelFromXp,
	getLevelProgress,
	getXpThreshold,
	LEVEL_DEFINITIONS,
	type LevelProgress,
	MAX_LEVEL,
} from "./levels";

/** @deprecated Use `getLevelFromXp` from `@xamsa/utils/levels` */
export function computeLevelFromXp(xp: number): number {
	return getLevelFromXpTable(xp);
}

/** XP for hosting any completed game session (including host-ended games). */
export const HOST_FULL_GAME_COMPLETION_XP_BONUS = 100;

/**
 * @deprecated Games no longer grant XP to players — only the host gets hosting
 * XP. Kept in case of legacy call sites or migrations.
 */
export function computeGamePlayerXpDelta(rank: number, score: number): number {
	const clamped = Math.max(0, score);
	if (rank === 1) return clamped + 200;
	if (rank <= 3) return clamped + 100;
	return clamped;
}
