import type { GameData } from "@/lib/game-types";

/** Shown in headers during live play: session position, not pack topic #. */
export function formatLiveTopicProgressLine(
	game: GameData,
	opts?: { compactQuestion?: boolean },
): string | null {
	const coq = game.currentQuestionOrder;
	if (coq == null || coq === 0) return null;
	const cot = game.currentTopicOrder;
	if (cot == null || cot === 0) return null;
	const idx = game.sessionTopicPackOrders.indexOf(cot);
	const sessionNum = idx >= 0 ? idx + 1 : cot;
	const total = Math.max(game.packTotalTopics, 1);
	const qPart = opts?.compactQuestion ? `Q${coq}` : `Question ${coq}`;
	return `Topic ${sessionNum} of ${total} · ${qPart}`;
}
