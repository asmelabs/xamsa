/**
 * Shared XP / level rules used by game finalization and pack publish rewards.
 */

/** XP granted to the host when a game is completed normally (not force-abandoned). */
export const HOST_FULL_GAME_COMPLETION_XP_BONUS = 100;

export function computeLevelFromXp(xp: number): number {
	return Math.max(1, Math.floor(xp / 1000) + 1);
}

/**
 * Per-player XP from a finished game: score-based with podium bonuses.
 */
export function computeGamePlayerXpDelta(rank: number, score: number): number {
	const clamped = Math.max(0, score);
	if (rank === 1) return clamped + 200;
	if (rank <= 3) return clamped + 100;
	return clamped;
}

const ELO_K_BASE = 32;

/**
 * Multi-player Elo adjustment from final placement.
 * Uses average opponent rating and a linear actual score from rank (1st → 1, last → 0).
 * Skip calling this for abandoned games (`force` finalize).
 */
export function computeMultiplayerEloDeltas(
	rankedUserIds: string[],
	ratings: Map<string, number>,
	kBase: number = ELO_K_BASE,
): Map<string, number> {
	const n = rankedUserIds.length;
	const deltas = new Map<string, number>();
	if (n < 2) return deltas;

	for (let i = 0; i < n; i++) {
		const userId = rankedUserIds[i];
		if (!userId) continue;
		const rank = i + 1;
		const Ri = ratings.get(userId) ?? 1000;

		let oppSum = 0;
		for (let j = 0; j < n; j++) {
			if (j === i) continue;
			const oid = rankedUserIds[j];
			if (oid) oppSum += ratings.get(oid) ?? 1000;
		}
		const avgOpp = oppSum / (n - 1);
		const expected = 1 / (1 + 10 ** ((avgOpp - Ri) / 400));
		const actual = (n - rank) / (n - 1);
		deltas.set(userId, Math.round(kBase * (actual - expected)));
	}

	return deltas;
}
