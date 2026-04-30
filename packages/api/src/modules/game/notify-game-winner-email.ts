import prisma from "@xamsa/db";
import { sendGameWinnerEmail } from "@xamsa/mail/notifications";
import type { FinalizeGameResult } from "./finalize-game";

/** Fire-and-forget: email rank-1 winner when a started game completes (outside the DB transaction). */
export function scheduleGameWinnerEmailIfNeeded(
	gameId: string,
	finalResult: FinalizeGameResult,
): void {
	const winnerPlayerId = finalResult.winnerId;

	if (finalResult.wasAlreadyCompleted || winnerPlayerId == null) {
		return;
	}

	void (async () => {
		try {
			const game = await prisma.game.findUnique({
				where: { id: gameId },
				select: {
					startedAt: true,
					pack: { select: { name: true } },
				},
			});
			if (!game?.startedAt) {
				return;
			}

			const player = await prisma.player.findUnique({
				where: { id: winnerPlayerId },
				include: {
					user: {
						select: { email: true, name: true, username: true },
					},
				},
			});
			const u = player?.user;
			const emailAddr = u?.email ?? "";
			if (!emailAddr || !u) {
				return;
			}

			await sendGameWinnerEmail({
				email: emailAddr,
				name: u.name || "Friend",
				packName: game.pack?.name,
				profileUsername: u.username,
			});
		} catch (err) {
			console.error("[scheduleGameWinnerEmailIfNeeded]", err);
		}
	})();
}
