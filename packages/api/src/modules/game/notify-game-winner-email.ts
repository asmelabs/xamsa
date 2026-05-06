import prisma from "@xamsa/db";
import { sendGameWinnerEmail } from "@xamsa/mail/notifications";
import { notifyGameFinished } from "../notification/dispatchers";
import { shouldSendCategoryEmail } from "../notification/email-gate";
import type { FinalizeGameResult } from "./finalize-game";

/**
 * Fire-and-forget post-finalize side effects:
 *   - winner email (rank 1) — gated by the recipient's `gameFinished`
 *     email preference + quiet hours;
 *   - in-app `game_finished` notification for the host and every player
 *     in the game.
 *
 * Runs outside the DB transaction so neither path can roll back the
 * finalize commit. Idempotent on `wasAlreadyCompleted`.
 */
export function scheduleGameWinnerEmailIfNeeded(
	gameId: string,
	finalResult: FinalizeGameResult,
): void {
	if (finalResult.wasAlreadyCompleted) {
		return;
	}

	void notifyGameFinished({ gameId }).catch((err) => {
		console.error("[scheduleGameWinnerEmailIfNeeded] in-app", err);
	});

	const winnerPlayerId = finalResult.winnerId;
	if (winnerPlayerId == null) {
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
						select: {
							id: true,
							email: true,
							name: true,
							username: true,
						},
					},
				},
			});
			const u = player?.user;
			const emailAddr = u?.email ?? "";
			if (!emailAddr || !u) {
				return;
			}

			const allowed = await shouldSendCategoryEmail({
				recipientUserId: u.id,
				actorUserId: null,
				category: "gameFinished",
			});
			if (!allowed) {
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
