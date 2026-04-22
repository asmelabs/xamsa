/**
 * Shared ordering for end-of-game standings (UI + finalizeGame).
 * Tie-break: score → correctAnswers → fewer incorrectAnswers → totalClicks → joinedAt.
 * Competition ranks: same numeric rank when all four metrics tie (joinedAt breaks display order only).
 */

export type StandingsComparable = {
	score: number;
	correctAnswers: number;
	incorrectAnswers: number;
	totalClicks: number;
	joinedAt: Date | string;
};

export function compareStandingsOrder(
	a: StandingsComparable,
	b: StandingsComparable,
): number {
	if (b.score !== a.score) {
		return b.score - a.score;
	}
	if (b.correctAnswers !== a.correctAnswers) {
		return b.correctAnswers - a.correctAnswers;
	}
	if (a.incorrectAnswers !== b.incorrectAnswers) {
		return a.incorrectAnswers - b.incorrectAnswers;
	}
	if (b.totalClicks !== a.totalClicks) {
		return b.totalClicks - a.totalClicks;
	}
	const at =
		typeof a.joinedAt === "string"
			? new Date(a.joinedAt).getTime()
			: a.joinedAt.getTime();
	const bt =
		typeof b.joinedAt === "string"
			? new Date(b.joinedAt).getTime()
			: b.joinedAt.getTime();
	return at - bt;
}

export function tiedForStandingsMetrics(
	a: StandingsComparable,
	b: StandingsComparable,
): boolean {
	return (
		a.score === b.score &&
		a.correctAnswers === b.correctAnswers &&
		a.incorrectAnswers === b.incorrectAnswers &&
		a.totalClicks === b.totalClicks
	);
}

/** Competition ranking (1,1,3 …) for a list already sorted best-first. */
export function competitionRanksFromSorted<T extends StandingsComparable>(
	sorted: T[],
): number[] {
	const ranks: number[] = [];
	for (let i = 0; i < sorted.length; i++) {
		if (i === 0) {
			ranks.push(1);
			continue;
		}
		const cur = sorted[i];
		const prev = sorted[i - 1];
		if (cur && prev && tiedForStandingsMetrics(cur, prev)) {
			ranks.push(ranks[i - 1] ?? 1);
		} else {
			ranks.push(i + 1);
		}
	}
	return ranks;
}
