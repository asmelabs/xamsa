/**
 * Multi-player Elo updates with placement + score margin (chess-like: you can
 * lose rating on a win if the field was weak and your margin was small).
 */

export type EloPlayerRow = {
	userId: string;
	/** 1 = best finish after tie-breaks */
	rank: number;
	score: number;
	/** Pre-game `User.elo` snapshot */
	ratingBefore: number;
};

export type CalculateEloDeltasOptions = {
	kBase?: number;
	/** When true (abandoned / force-finalized), skip all adjustments. */
	forceAborted?: boolean;
	/** Weight on placement vs normalized score margin (defaults favor margin). */
	wP?: number;
	wM?: number;
};

function clamp01(n: number): number {
	return Math.max(0, Math.min(1, n));
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

	const k = options.kBase ?? 32;
	const wP = options.wP ?? 0.45;
	const wM = options.wM ?? 0.55;

	const scores = players.map((p) => p.score);
	const sMax = Math.max(...scores);
	const sMin = Math.min(...scores);
	const spread = sMax - sMin;

	for (const p of players) {
		const Ri = p.ratingBefore;
		let oppSum = 0;
		for (const o of players) {
			if (o.userId === p.userId) continue;
			oppSum += o.ratingBefore;
		}
		const avgOpp = oppSum / (n - 1);
		const expected = 1 / (1 + 10 ** ((avgOpp - Ri) / 400));

		const placementScore = (n - p.rank) / (n - 1);
		const marginScore =
			spread > 0 ? clamp01((p.score - sMin) / spread) : placementScore;

		const actual = clamp01(wP * placementScore + wM * marginScore);
		out.set(p.userId, Math.round(k * (actual - expected)));
	}

	return out;
}
