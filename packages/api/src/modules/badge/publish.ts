import {
	type BadgeEarnedMessage,
	channels,
	GAME_EVENTS,
} from "@xamsa/ably/channels";
import { ablyRest } from "@xamsa/ably/server";

export async function publishBadgeEarned(
	code: string,
	payload: BadgeEarnedMessage,
): Promise<void> {
	const channel = ablyRest.channels.get(channels.game(code));
	await channel.publish(GAME_EVENTS.BADGE_EARNED, payload);
}

/**
 * Publishes one Ably message so the client can append every badge in one update
 * (e.g. Ace + Jackpot) instead of interleaving with other state updates.
 */
export async function publishBadgeEarnedMany(
	code: string,
	events: BadgeEarnedMessage[],
): Promise<void> {
	if (events.length === 0) {
		return;
	}
	const channel = ablyRest.channels.get(channels.game(code));
	await channel.publish(GAME_EVENTS.BADGE_EARNED_BATCH, { events });
}
