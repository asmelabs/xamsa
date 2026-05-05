/**
 * Multi-player Elo updates.
 *
 * For each player i we compare them pairwise against every other player j and
 * average the result. This is closer to how chess multiplayer events work than
 * the previous "average opponent + placement vs margin" model — a strong field
 * with a tight finish moves less Elo than a weak field with a blowout.
 *
 *   expected_ij        = 1 / (1 + 10^((R_j - R_i) / 400))
 *   rankActual_ij      = 1 if rank_i < rank_j, 0 if rank_i > rank_j, 0.5 tie
 *   marginActual_ij    = 0.5 + 0.5 * (normScore_i - normScore_j)
 *                        where normScore = (score - sMin) / max(1, sMax - sMin)
 *   blendedActual_ij   = wRank * rankActual_ij + wMargin * marginActual_ij
 *   delta_i            = K_eff * mean_j(blendedActual_ij - expected_ij)
 *                        + ACC_BETA * (correctRate_i - 0.5)
 *
 * `K_eff` shrinks as a player's `gamesPlayed` grows so brand-new accounts move
 * fast (provisional) and settled accounts move slowly (high confidence).
 */

export type EloPlayerRow = {
	userId: string;
	/** 1 = best finish after tie-breaks */
	rank: number;
	score: number;
	/** Pre-game `User.elo` snapshot */
	ratingBefore: number;
	/** Player's lifetime `totalGamesPlayed` BEFORE this game (for K-factor scaling). */
	gamesPlayedBefore?: number;
	/** This game's correct/incorrect/expired clicks (for the small accuracy modifier). */
	correctAnswers?: number;
	incorrectAnswers?: number;
	expiredAnswers?: number;
};

export type CalculateEloDeltasOptions = {
	kBase?: number;
	kMin?: number;
	provisionalGames?: number;
	/** When true (abandoned / force-finalized), skip all adjustments. */
	forceAborted?: boolean;
	/** Weight on placement vs normalized score margin (defaults: rank slightly favored). */
	wRank?: number;
	wMargin?: number;
	/** Coefficient on the (correctRate - 0.5) accuracy modifier. */
	accBeta?: number;
};

export const ELO_K_BASE_DEFAULT = 32;
export const ELO_K_MIN_DEFAULT = 12;
export const ELO_PROVISIONAL_GAMES_DEFAULT = 200;
export const ELO_W_RANK_DEFAULT = 0.55;
export const ELO_W_MARGIN_DEFAULT = 0.45;
export const ELO_ACC_BETA_DEFAULT = 4;

function clamp01(n: number): number {
	return Math.max(0, Math.min(1, n));
}

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, n));
}

function effectiveK(
	kBase: number,
	kMin: number,
	provisionalGames: number,
	gamesPlayedBefore: number,
): number {
	const ramp = clamp01(gamesPlayedBefore / provisionalGames);
	return Math.max(kMin, kBase - (kBase - kMin) * ramp);
}

function correctRate(p: EloPlayerRow): number {
	const c = p.correctAnswers ?? 0;
	const w = p.incorrectAnswers ?? 0;
	const x = p.expiredAnswers ?? 0;
	const total = c + w + x;
	if (total <= 0) return 0.5;
	return c / total;
}

/**
 * Returns integer Elo delta per userId. Empty map if aborted or fewer than 2 players.
 */
export function calculateEloDeltas(
	players: EloPlayerRow[],
	options: CalculateEloDeltasOptions = {},
): Map<string, number> {
	const out = new Map<string, number>();
	if (options.forceAborted) return out;

	const n = players.length;
	if (n < 2) return out;

	const kBase = options.kBase ?? ELO_K_BASE_DEFAULT;
	const kMin = options.kMin ?? ELO_K_MIN_DEFAULT;
	const provisionalGames =
		options.provisionalGames ?? ELO_PROVISIONAL_GAMES_DEFAULT;
	const wRank = options.wRank ?? ELO_W_RANK_DEFAULT;
	const wMargin = options.wMargin ?? ELO_W_MARGIN_DEFAULT;
	const accBeta = options.accBeta ?? ELO_ACC_BETA_DEFAULT;

	const scores = players.map((p) => p.score);
	const sMax = Math.max(...scores);
	const sMin = Math.min(...scores);
	const spread = sMax - sMin;

	const normScore = (s: number): number =>
		spread > 0 ? clamp01((s - sMin) / spread) : 0.5;

	for (const p of players) {
		const Ri = p.ratingBefore;
		const normI = normScore(p.score);

		let expectedSum = 0;
		let actualSum = 0;
		for (const o of players) {
			if (o.userId === p.userId) continue;
			const Rj = o.ratingBefore;
			const expected = 1 / (1 + 10 ** ((Rj - Ri) / 400));
			let rankActual: number;
			if (p.rank < o.rank) rankActual = 1;
			else if (p.rank > o.rank) rankActual = 0;
			else rankActual = 0.5;
			const normJ = normScore(o.score);
			const marginActual = clamp01(0.5 + 0.5 * (normI - normJ));
			const blended = wRank * rankActual + wMargin * marginActual;
			expectedSum += expected;
			actualSum += blended;
		}

		const expected = expectedSum / (n - 1);
		const actual = actualSum / (n - 1);
		const k = effectiveK(
			kBase,
			kMin,
			provisionalGames,
			p.gamesPlayedBefore ?? 0,
		);
		const accuracyBoost = accBeta * (correctRate(p) - 0.5);
		const raw = k * (actual - expected) + accuracyBoost;
		// Cap any single-game swing at ±k to keep ratings stable in unusual fields.
		const capped = clamp(raw, -k, k);
		out.set(p.userId, Math.round(capped));
	}

	return out;
}
