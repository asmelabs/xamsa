/**
 * Question / topic / pack difficulty (QDR, TDR, PDR) — see DIFFICULTY_RATE_IMPLEMENTATION_SPEC.md
 */

export const QDR_INITIAL = 4.5;
export const QDR_ELO_EQUIV_INITIAL = 1000;
export const ALPHA = 1 / 400;
export const K0 = 4;
export const N0 = 20;

/**
 * K-factor for **non-click** (skip) signals — applied when an active high-Elo
 * player saw a question but produced no Click row by the time it closed.
 * Smaller than K0 so non-clickers nudge but don't dominate; high-Elo skips
 * imply the question is harder than it looked.
 */
export const K_SKIP = K0 / 4;

/**
 * Skip signal is only meaningful for players whose pre-game Elo is at or above
 * this floor; below it, "didn't buzz" is too noisy to be a difficulty signal.
 */
export const MIN_ELO_FOR_SKIP_SIGNAL = 1000;

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

export type QdrSkipUpdateArgs = {
	qdrEloEquiv: number;
	qdrScoredAttempts: number;
	/** Pre-game Elo for the active player who didn't buzz on this question. */
	userEloAtGameStart: number | null;
};

/**
 * Non-click signal: an active player whose pre-game Elo is at or above
 * {@link MIN_ELO_FOR_SKIP_SIGNAL} saw the question but produced no Click row
 * by the time it closed. Treat like a wrong answer (`outcome = 0`) but with a
 * much smaller `K_SKIP` so non-clickers nudge difficulty without overwhelming
 * the signal from real buzzers.
 *
 * Note: by design we **do not** increment `qdrScoredAttempts` for skips — TDR
 * still averages "questions with at least one resolved click" via
 * {@link recomputeTdr}, which keeps the topic-level numbers comparable across
 * games where some players just sat out a topic.
 */
export function computeQdrSkipUpdate(args: QdrSkipUpdateArgs): {
	qdrEloEquiv: number;
	qdr: number;
} {
	const userElo = args.userEloAtGameStart ?? ELO_AT_GAME_START_FALLBACK;
	if (userElo < MIN_ELO_FOR_SKIP_SIGNAL) {
		return {
			qdrEloEquiv: args.qdrEloEquiv,
			qdr: normalizeToQdr(args.qdrEloEquiv),
		};
	}
	const expected = expectedCorrect(userElo, args.qdrEloEquiv);
	const kBase = K_SKIP / (1 + args.qdrScoredAttempts / N0);
	const delta = -kBase * (0 - expected);
	const qdrEloEquiv = args.qdrEloEquiv + delta;
	return {
		qdrEloEquiv,
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
