/**
 * Question / topic / pack difficulty (QDR, TDR, PDR) — see DIFFICULTY_RATE_IMPLEMENTATION_SPEC.md
 */

export const QDR_INITIAL = 4.5;
export const QDR_ELO_EQUIV_INITIAL = 1000;
export const ALPHA = 1 / 400;
export const K0 = 4;
export const N0 = 20;

/** Elo snapshot fallback when `Player.eloAtGameStart` is null (legacy rows). */
export const ELO_AT_GAME_START_FALLBACK = 1000;

/**
 * P(correct) for a user vs a question, logistic in (userElo - qdrEloEquiv) space.
 */
export function expectedCorrect(
	userElo: number,
	qdrEloEquiv: number,
	alpha: number = ALPHA,
): number {
	return 1 / (1 + Math.exp(-alpha * (userElo - qdrEloEquiv)));
}

/**
 * Map internal Elo-equivalent to [1, 10]. Piecewise linear with anchors:
 * 555→1, 1000→4.5, 1665→10.
 * Uses **two decimal** rounding so typical single-play elo deltas (~2–8) produce a visible change;
 * one-decimal rounding collapsed small moves to a flat 4.5.
 */
export function normalizeToQdr(eloEquiv: number): number {
	const raw = piecewiseEloToRaw(eloEquiv);
	const clamped = Math.max(1, Math.min(10, raw));
	return Math.round(clamped * 100) / 100;
}

function piecewiseEloToRaw(eloEquiv: number): number {
	if (eloEquiv <= 555) return 1;
	if (eloEquiv >= 1665) return 10;
	if (eloEquiv < 1000) {
		return 1 + ((eloEquiv - 555) * 3.5) / (1000 - 555);
	}
	return 4.5 + ((eloEquiv - 1000) * 5.5) / (1665 - 1000);
}

export type QdrUpdateArgs = {
	qdrEloEquiv: number;
	qdrScoredAttempts: number;
	/** `User.elo` at game start for this player, or null → {@link ELO_AT_GAME_START_FALLBACK} */
	userEloAtGameStart: number | null;
	outcome: 0 | 1;
};

export type QdrUpdateResult = {
	qdrEloEquiv: number;
	qdrScoredAttempts: number;
	qdr: number;
};

/**
 * One scored click update. Inverts the usual Elo sign so the **question** rating moves:
 * strong user wrong → harder (higher `qdrEloEquiv`), weak user correct → easier.
 */
export function computeQdrUpdate(args: QdrUpdateArgs): QdrUpdateResult {
	const userElo = args.userEloAtGameStart ?? ELO_AT_GAME_START_FALLBACK;
	const expected = expectedCorrect(userElo, args.qdrEloEquiv);
	const k = K0 / (1 + args.qdrScoredAttempts / N0);
	const delta = -k * (args.outcome - expected);
	const qdrEloEquiv = args.qdrEloEquiv + delta;
	const qdrScoredAttempts = args.qdrScoredAttempts + 1;
	return {
		qdrEloEquiv,
		qdrScoredAttempts,
		qdr: normalizeToQdr(qdrEloEquiv),
	};
}

/**
 * Average QDR of questions with at least one scored attempt. Empty → neutral 4.5.
 */
export function recomputeTdr(
	qdrs: number[],
	scoredAttemptsByQuestion: number[],
): number {
	if (qdrs.length !== scoredAttemptsByQuestion.length) {
		throw new Error("recomputeTdr: array length mismatch");
	}
	const used: number[] = [];
	for (let i = 0; i < qdrs.length; i++) {
		if (scoredAttemptsByQuestion[i]! > 0) {
			used.push(qdrs[i]!);
		}
	}
	if (used.length === 0) return QDR_INITIAL;
	const avg = used.reduce((s, v) => s + v, 0) / used.length;
	return Math.round(avg * 100) / 100;
}

/** Plain mean of topic TDRs. Empty list → 4.5. */
export function recomputePdr(tdrs: number[]): number {
	if (tdrs.length === 0) return QDR_INITIAL;
	const avg = tdrs.reduce((s, v) => s + v, 0) / tdrs.length;
	return Math.round(avg * 100) / 100;
}
