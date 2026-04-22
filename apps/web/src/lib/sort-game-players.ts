import {
	compareStandingsOrder,
	competitionRanksFromSorted,
} from "@xamsa/utils/game-standings";
import type { GamePlayer } from "@/lib/game-types";

function toStandingsSlice(p: GamePlayer) {
	return {
		score: p.score,
		correctAnswers: p.correctAnswers,
		incorrectAnswers: p.incorrectAnswers,
		totalClicks: p.totalClicks,
		joinedAt: p.joinedAt,
	};
}

/** Sort for scoreboard: DB `rank` when present; else same rules as finalizeGame. */
export function sortGamePlayersForScoreboard(
	players: GamePlayer[],
): GamePlayer[] {
	return [...players].sort((a, b) => {
		if (a.rank != null && b.rank != null) {
			return a.rank - b.rank;
		}
		if (a.rank != null) {
			return -1;
		}
		if (b.rank != null) {
			return 1;
		}
		return compareStandingsOrder(toStandingsSlice(a), toStandingsSlice(b));
	});
}

/** Competition ranks for an array already sorted with `sortGamePlayersForScoreboard`. */
export function competitionRanksForSortedPlayers(
	sorted: GamePlayer[],
): number[] {
	return competitionRanksFromSorted(sorted.map(toStandingsSlice));
}
