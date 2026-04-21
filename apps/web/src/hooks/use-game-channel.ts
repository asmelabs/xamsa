import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getAblyClient } from "@/lib/ably";
import type { GameClick, GameData, GameHostClick } from "@/lib/game-types";
import { orpc } from "@/utils/orpc";

type PlayerLeftData = {
	playerId: string;
	reason: "voluntary" | "kicked";
	expiredClickId?: string | null;
};

type BuzzIntentData = {
	intentId: string;
	playerId: string;
	clickedAt: number;
};

type ClickNewData = {
	intentId: string;
	clickId: string;
	playerId: string;
	position: number;
	status: string;
	clickedAt: string;
};

type PlayerScoreUpdate = {
	playerId: string;
	score: number;
	correctAnswers: number;
	incorrectAnswers: number;
	expiredClicks: number;
	currentCorrectStreak: number;
	currentWrongStreak: number;
	longestCorrectStreak: number;
	longestWrongStreak: number;
	peakScore: number;
	lowestScore: number;
};

export type QuestionReveal = {
	order: number;
	text: string | null;
	answer: string | null;
};

export type ClickResolvedData = {
	resolution: "correct" | "wrong";
	click: {
		id: string;
		playerId: string;
		status: "correct" | "wrong";
		pointsAwarded: number;
		answeredAt: string;
	};
	expiredClicks: { id: string; playerId: string }[];
	playerScores: PlayerScoreUpdate[];
	questionReveal?: QuestionReveal | null;
	isAuthoritative?: boolean;
};

export type QuestionRevealedData = {
	order: number;
	text: string | null;
	answer: string | null;
	isAuthoritative?: boolean;
};

export type HostCurrentQuestion = {
	order: number;
	text: string;
	answer: string;
	acceptableAnswers: string[];
	explanation?: string | null;
};

export type QuestionAdvancedData = {
	currentTopicOrder: number;
	currentQuestionOrder: number;
	isQuestionRevealed: boolean;
	currentTopic: {
		slug: string;
		name: string;
		order: number;
		description?: string | null;
	} | null;
	currentQuestionPublic: {
		order: number;
		points: number;
	};
	hostCurrentQuestion?: HostCurrentQuestion | null;
	isAuthoritative?: boolean;
};

export type GameCompletedData = {
	finishedAt: string;
	winnerId: string | null;
	playerRanks: { id: string; rank: number; score: number }[];
	isAuthoritative?: boolean;
};

export type GamePausedData = {
	status: "paused";
	pausedAt: string | Date | null;
	isAuthoritative?: boolean;
};

export type GameResumedData = {
	status: "active";
	pausedAt: string | Date | null;
	isAuthoritative?: boolean;
};

/**
 * Builds a tentative click entry used for optimistic UI before
 * the server confirms the buzz.
 */
function buildTentativeClick(data: BuzzIntentData, position: number): GameClick {
	return {
		id: `tentative_${data.intentId}`,
		_intentId: data.intentId,
		_isTentative: true,
		playerId: data.playerId,
		position,
		status: "pending",
		clickedAt: new Date(data.clickedAt),
	};
}

function buildTentativeHostClick(
	data: BuzzIntentData,
	position: number,
): GameHostClick {
	return {
		id: `tentative_${data.intentId}`,
		_intentId: data.intentId,
		_isTentative: true,
		playerId: data.playerId,
		position,
		status: "pending",
		clickedAt: new Date(data.clickedAt),
		answeredAt: null,
		reactionMs: null,
		pointsAwarded: 0,
	};
}

/**
 * Applies a buzz intent to the cached game, returning the new snapshot.
 * Dedupes both by intentId and by playerId (a player can only have one click
 * per question). Updates both public `clicks` and host `hostData.clickDetails`
 * so the host also sees the optimistic entry.
 */
export function applyBuzzIntentToGame(
	old: GameData | undefined,
	data: BuzzIntentData,
): GameData | undefined {
	if (!old) return old;

	const alreadyHasIntent = old.clicks.some(
		(c) => c._intentId === data.intentId,
	);
	const alreadyHasPlayerClick = old.clicks.some(
		(c) => c.playerId === data.playerId,
	);
	if (alreadyHasIntent || alreadyHasPlayerClick) return old;

	const position = old.clicks.length + 1;
	const tentativeClick = buildTentativeClick(data, position);

	const nextHostData = old.hostData
		? {
				...old.hostData,
				clickDetails: [
					...old.hostData.clickDetails,
					buildTentativeHostClick(data, position),
				],
			}
		: old.hostData;

	return {
		...old,
		clicks: [...old.clicks, tentativeClick],
		hostData: nextHostData,
	};
}

/**
 * Applies a server-confirmed click. Replaces the matching tentative entry
 * (by intentId) if any and dedupes by confirmed click id / playerId.
 */
export function applyClickNewToGame(
	old: GameData | undefined,
	data: ClickNewData,
): GameData | undefined {
	if (!old) return old;

	const status = data.status as GameClick["status"];
	const clickedAt = new Date(data.clickedAt);

	const confirmedClick: GameClick = {
		id: data.clickId,
		playerId: data.playerId,
		position: data.position,
		status,
		clickedAt,
	};

	// drop any tentative / stale entries for this intent or player, then append confirmed
	const clicksWithoutMatches = old.clicks.filter(
		(c) =>
			c._intentId !== data.intentId &&
			c.id !== data.clickId &&
			// also drop a lingering tentative from the same player (defensive)
			!(c._isTentative && c.playerId === data.playerId),
	);

	const nextClicks = [...clicksWithoutMatches, confirmedClick].sort(
		(a, b) => a.position - b.position,
	);

	const nextHostData = old.hostData
		? {
				...old.hostData,
				clickDetails: [
					...old.hostData.clickDetails.filter(
						(c) =>
							c._intentId !== data.intentId &&
							c.id !== data.clickId &&
							!(c._isTentative && c.playerId === data.playerId),
					),
					{
						...confirmedClick,
						answeredAt: null,
						reactionMs: null,
						pointsAwarded: 0,
					} satisfies GameHostClick,
				].sort((a, b) => a.position - b.position),
			}
		: old.hostData;

	return {
		...old,
		clicks: nextClicks,
		hostData: nextHostData,
	};
}

/**
 * Applies a host resolution to the cached game. Updates the target click's
 * status + pointsAwarded, cascades every expired click, and replaces the
 * scores/streaks for every affected player in `players` and `myPlayer`.
 */
export function applyClickResolvedToGame(
	old: GameData | undefined,
	data: ClickResolvedData,
): GameData | undefined {
	if (!old) return old;

	const answeredAt = new Date(data.click.answeredAt);
	const expiredIds = new Set(data.expiredClicks.map((c) => c.id));
	const scoresByPlayerId = new Map(
		data.playerScores.map((s) => [s.playerId, s]),
	);

	const patchClick = <T extends GameClick | GameHostClick>(c: T): T => {
		if (c.id === data.click.id) {
			return {
				...c,
				status: data.click.status,
				...("answeredAt" in c ? { answeredAt } : {}),
				...("pointsAwarded" in c
					? { pointsAwarded: data.click.pointsAwarded }
					: {}),
			};
		}
		if (expiredIds.has(c.id)) {
			return {
				...c,
				status: "expired" as const,
				...("answeredAt" in c ? { answeredAt } : {}),
				...("pointsAwarded" in c ? { pointsAwarded: 0 } : {}),
			};
		}
		return c;
	};

	const nextClicks = old.clicks.map(patchClick);
	const nextHostData = old.hostData
		? {
				...old.hostData,
				clickDetails: old.hostData.clickDetails.map(patchClick),
			}
		: old.hostData;

	const applyScoreUpdate = <P extends { id: string; score: number }>(
		player: P,
	): P => {
		const update = scoresByPlayerId.get(player.id);
		if (!update) return player;
		return { ...player, score: update.score };
	};

	const nextPlayers = old.players.map(applyScoreUpdate);
	const nextMyPlayer = old.myPlayer ? applyScoreUpdate(old.myPlayer) : null;

	// Reveal (idempotent): if payload says reveal and we're not already revealed
	// with the same text/answer, patch the visible `currentQuestion` + flip flag.
	let nextIsQuestionRevealed = old.isQuestionRevealed;
	let nextCurrentQuestion = old.currentQuestion;

	if (data.questionReveal && old.currentQuestion) {
		nextIsQuestionRevealed = true;
		nextCurrentQuestion = {
			...old.currentQuestion,
			text: data.questionReveal.text ?? old.currentQuestion.text,
			answer: data.questionReveal.answer ?? old.currentQuestion.answer,
		};
	}

	return {
		...old,
		clicks: nextClicks,
		hostData: nextHostData,
		players: nextPlayers,
		myPlayer: nextMyPlayer,
		isQuestionRevealed: nextIsQuestionRevealed,
		currentQuestion: nextCurrentQuestion,
	};
}

/**
 * Applies a manual/auto reveal: flips isQuestionRevealed and patches the
 * public currentQuestion with text/answer. Idempotent.
 */
export function applyQuestionRevealToGame(
	old: GameData | undefined,
	data: QuestionRevealedData,
): GameData | undefined {
	if (!old) return old;
	if (!old.currentQuestion) return old;

	const nextCurrentQuestion = {
		...old.currentQuestion,
		text: data.text ?? old.currentQuestion.text,
		answer: data.answer ?? old.currentQuestion.answer,
	};

	return {
		...old,
		isQuestionRevealed: true,
		currentQuestion: nextCurrentQuestion,
	};
}

/**
 * Applies an advance: clears clicks + hostData.clickDetails, bumps the current
 * pointers, resets the revealed flag, swaps currentTopic + currentQuestion
 * snapshots. If the payload carries hostCurrentQuestion and the cache is host
 * data, we also patch hostData.currentQuestion so the host sees the full next
 * question without a refetch. Idempotent.
 */
export function applyQuestionAdvancedToGame(
	old: GameData | undefined,
	data: QuestionAdvancedData,
): GameData | undefined {
	if (!old) return old;

	// If we've already advanced past this payload (pointers equal and we're not
	// stuck in a tentative state), treat as no-op for idempotency.
	const alreadyApplied =
		old.currentTopicOrder === data.currentTopicOrder &&
		old.currentQuestionOrder === data.currentQuestionOrder &&
		old.isQuestionRevealed === data.isQuestionRevealed &&
		old.clicks.length === 0;

	if (alreadyApplied && !data.hostCurrentQuestion) {
		return old;
	}

	const nextPublicCurrentQuestion = {
		order: data.currentQuestionPublic.order,
		points: data.currentQuestionPublic.points,
		text: null,
		answer: null,
		explanation: null,
	};

	const nextHostData = old.hostData
		? {
				...old.hostData,
				clickDetails: [],
				currentQuestion: data.hostCurrentQuestion
					? data.hostCurrentQuestion
					: old.hostData.currentQuestion,
			}
		: old.hostData;

	return {
		...old,
		currentTopicOrder: data.currentTopicOrder,
		currentQuestionOrder: data.currentQuestionOrder,
		isQuestionRevealed: data.isQuestionRevealed,
		currentTopic: data.currentTopic,
		currentQuestion: nextPublicCurrentQuestion,
		clicks: [],
		hostData: nextHostData,
	};
}

/**
 * Applies a PLAYER_LEFT event: flips the leaver's player.status to "left",
 * stamps leftAt, and removes any in-flight pending click they had (optimistic
 * so the queue re-renders without waiting for a refetch). If the payload
 * ships a confirmed expiredClickId from the server, we mark that click
 * expired instead of dropping it entirely to keep parity with the real db.
 */
export function applyPlayerLeftToGame(
	old: GameData | undefined,
	data: PlayerLeftData,
): GameData | undefined {
	if (!old) return old;

	const leftAt = new Date();

	const nextPlayers = old.players.map((p) =>
		p.id === data.playerId
			? {
					...p,
					status: "left" as const,
					leftAt,
				}
			: p,
	);

	const nextMyPlayer =
		old.myPlayer && old.myPlayer.id === data.playerId
			? { ...old.myPlayer, status: "left" as const, leftAt }
			: old.myPlayer;

	const patchClicks = <T extends GameClick | GameHostClick>(
		clicks: T[],
	): T[] => {
		// If server told us which click id flipped to expired, update it in
		// place; otherwise drop any pending click from the leaver.
		if (data.expiredClickId) {
			return clicks.map((c) =>
				c.id === data.expiredClickId
					? ({
							...c,
							status: "expired" as const,
							...("answeredAt" in c ? { answeredAt: leftAt } : {}),
							...("pointsAwarded" in c ? { pointsAwarded: 0 } : {}),
						} as T)
					: c,
			);
		}

		return clicks.filter(
			(c) => !(c.playerId === data.playerId && c.status === "pending"),
		);
	};

	const nextClicks = patchClicks(old.clicks);
	const nextHostData = old.hostData
		? {
				...old.hostData,
				clickDetails: patchClicks(old.hostData.clickDetails),
			}
		: old.hostData;

	return {
		...old,
		players: nextPlayers,
		myPlayer: nextMyPlayer,
		clicks: nextClicks,
		hostData: nextHostData,
	};
}

/**
 * Applies a pause event. Flips status to "paused" and stamps pausedAt so any
 * UI that reads either field (banner, buzzer, host controls) updates in the
 * same render. Idempotent: if the cache is already paused we return as-is.
 */
export function applyGamePausedToGame(
	old: GameData | undefined,
	data: GamePausedData,
): GameData | undefined {
	if (!old) return old;
	if (old.status === "paused") return old;

	const pausedAt =
		data.pausedAt instanceof Date
			? data.pausedAt
			: data.pausedAt
				? new Date(data.pausedAt)
				: new Date();

	return {
		...old,
		status: "paused",
		pausedAt,
	};
}

/**
 * Applies a resume event. Flips status back to "active" and clears pausedAt.
 * Idempotent.
 */
export function applyGameResumedToGame(
	old: GameData | undefined,
	_data: GameResumedData,
): GameData | undefined {
	if (!old) return old;
	if (old.status === "active") return old;

	return {
		...old,
		status: "active",
		pausedAt: null,
	};
}

/**
 * Applies game completion: flips status, stores finishedAt + winnerId, and
 * patches every player's rank + score from the ranked payload. Idempotent.
 */
export function applyGameCompletedToGame(
	old: GameData | undefined,
	data: GameCompletedData,
): GameData | undefined {
	if (!old) return old;

	const rankByPlayerId = new Map(
		data.playerRanks.map((r) => [r.id, r] as const),
	);

	const applyRank = <P extends { id: string; score: number }>(
		player: P,
	): P => {
		const update = rankByPlayerId.get(player.id);
		if (!update) return player;
		return { ...player, score: update.score, rank: update.rank };
	};

	return {
		...old,
		status: "completed",
		finishedAt: new Date(data.finishedAt),
		winnerId: data.winnerId,
		players: old.players.map(applyRank),
		myPlayer: old.myPlayer ? applyRank(old.myPlayer) : null,
	};
}

export function useGameChannel(code: string) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	// Track already-toasted click resolutions so intent + authoritative
	// events for the same click id don't fire two toasts.
	const toastedClickIdsRef = useRef<Set<string>>(new Set());
	// Dedupe host-disconnect reports so a single client doesn't spam the
	// server endpoint while the grace period is still running.
	const hostDisconnectFiredRef = useRef(false);

	useEffect(() => {
		const client = getAblyClient();
		const channel = client.channels.get(channels.game(code));
		const queryKey = orpc.game.findOne.queryKey({ input: { code } });

		channel.presence.enter().catch(() => {
			// presence is best-effort; realtime state itself is what matters
		});

		const invalidateGame = () => {
			queryClient.invalidateQueries({ queryKey });
		};

		// Always refetch once on mount so cached state reflects anything that
		// happened while this user was away (refresh, tab switch, reconnect).
		invalidateGame();

		// Also resync on every Ably reconnect event so network blips don't
		// leave the client staring at a stale cache.
		const onConnectionConnected = () => {
			invalidateGame();
		};
		client.connection.on("connected", onConnectionConnected);

		const onGameStarted = () => invalidateGame();
		const onPlayerJoined = () => invalidateGame();

		const onClickNew = (msg: { data?: unknown }) => {
			const data = msg.data as ClickNewData;

			const previous = queryClient.getQueryData<GameData>(queryKey);
			const wasAlreadyConfirmed = previous?.clicks.some(
				(c) => c.id === data.clickId,
			);

			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyClickNewToGame(old, data),
			);

			// surface a small notification — but not to the buzzer themselves,
			// and only on first confirmation
			if (!wasAlreadyConfirmed) {
				const myPlayerId = previous?.myPlayer?.id;
				const buzzer = previous?.players.find(
					(p) => p.id === data.playerId,
				);
				if (buzzer && data.playerId !== myPlayerId) {
					toast(`${buzzer.user.name} buzzed`, {
						description: `#${data.position} in queue`,
						duration: 1500,
					});
				}
			}
		};

		const onPlayerLeft = (msg: { data?: unknown }) => {
			const data = msg.data as PlayerLeftData;

			const cachedGame = queryClient.getQueryData<GameData>(queryKey);

			// Apply optimistically first so the UI updates without waiting on
			// the authoritative refetch (keeps queue + player status in sync).
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyPlayerLeftToGame(old, data),
			);

			if (
				data.reason === "kicked" &&
				cachedGame?.myPlayer?.id === data.playerId
			) {
				toast.error("You were kicked from this game");
				navigate({ to: "/" });
				return;
			}

			if (
				data.reason === "voluntary" &&
				cachedGame?.myPlayer?.id === data.playerId
			) {
				// The leaver themselves already navigated; no toast needed.
				return;
			}

			// Refetch as a safety net so authoritative counts/stats line up.
			invalidateGame();
		};

		const onBuzzIntent = (msg: { data?: unknown }) => {
			const data = msg.data as BuzzIntentData;
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyBuzzIntentToGame(old, data),
			);
		};

		const onClickResolved = (msg: { data?: unknown }) => {
			const data = msg.data as ClickResolvedData;

			const previous = queryClient.getQueryData<GameData>(queryKey);

			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyClickResolvedToGame(old, data),
			);

			const myPlayerId = previous?.myPlayer?.id;
			const resolvedPlayer = previous?.players.find(
				(p) => p.id === data.click.playerId,
			);

			// Don't toast the resolved player themselves — their BuzzButton
			// already changes state. Others (including host) get a quick toast.
			// Dedupe across CLICK_RESOLVE_INTENT + CLICK_RESOLVED for the same id.
			const alreadyToasted = toastedClickIdsRef.current.has(data.click.id);
			if (
				!alreadyToasted &&
				resolvedPlayer &&
				data.click.playerId !== myPlayerId
			) {
				toastedClickIdsRef.current.add(data.click.id);
				const name = resolvedPlayer.user.name;
				if (data.resolution === "correct") {
					toast.success(`${name} got it right`, {
						description: `+${data.click.pointsAwarded} points`,
						duration: 2000,
					});
				} else {
					toast.error(`${name} got it wrong`, {
						description: `${data.click.pointsAwarded} points`,
						duration: 2000,
					});
				}
			}
		};

		const onQuestionRevealed = (msg: { data?: unknown }) => {
			const data = msg.data as QuestionRevealedData;
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyQuestionRevealToGame(old, data),
			);
		};

		const onQuestionAdvanced = (msg: { data?: unknown }) => {
			const data = msg.data as QuestionAdvancedData;
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyQuestionAdvancedToGame(old, data),
			);

			// Safety net: on the authoritative event, refetch so the host picks up
			// the full hostData.currentQuestion if the mutation response hasn't
			// been applied yet.
			if (data.isAuthoritative) {
				const cached = queryClient.getQueryData<GameData>(queryKey);
				if (cached?.isHost && !data.hostCurrentQuestion) {
					invalidateGame();
				}
			}
		};

		const onGameCompleted = (msg: { data?: unknown }) => {
			const data = msg.data as GameCompletedData;
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyGameCompletedToGame(old, data),
			);
			if (data.isAuthoritative) invalidateGame();
		};

		const onGamePaused = (msg: { data?: unknown }) => {
			const data = msg.data as GamePausedData;
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyGamePausedToGame(old, data),
			);
		};

		const onGameResumed = (msg: { data?: unknown }) => {
			const data = msg.data as GameResumedData;
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyGameResumedToGame(old, data),
			);
		};

		// Presence-based host disconnect detection: non-host clients watch for
		// the host's clientId leaving presence; when observed they call the
		// server endpoint which runs a grace period + re-check before
		// finalizing. Safe to call repeatedly — server is idempotent — but we
		// still dedupe locally to avoid spamming during the grace window.
		const onPresenceLeave = (member: { clientId?: string }) => {
			const cached = queryClient.getQueryData<GameData>(queryKey);
			if (!cached || !member.clientId) return;
			if (cached.isHost) return; // host's own client doesn't report itself
			if (cached.status !== "active") return;
			if (member.clientId !== cached.hostId) return;
			if (hostDisconnectFiredRef.current) return;
			hostDisconnectFiredRef.current = true;
			void orpc.game.handleHostDisconnect
				.call({ code })
				.catch(() => {
					// resetting lets a subsequent disconnect re-attempt
					hostDisconnectFiredRef.current = false;
				});
		};
		channel.presence.subscribe("leave", onPresenceLeave);

		// If the host's presence is seen returning, reset the disconnect
		// latch so a future leave can re-trigger the check.
		const onPresenceEnter = (member: { clientId?: string }) => {
			const cached = queryClient.getQueryData<GameData>(queryKey);
			if (!cached || !member.clientId) return;
			if (member.clientId === cached.hostId) {
				hostDisconnectFiredRef.current = false;
			}
		};
		channel.presence.subscribe("enter", onPresenceEnter);

		channel.subscribe(GAME_EVENTS.GAME_STARTED, onGameStarted);
		channel.subscribe(GAME_EVENTS.PLAYER_JOINED, onPlayerJoined);
		channel.subscribe(GAME_EVENTS.PLAYER_LEFT, onPlayerLeft);
		channel.subscribe(GAME_EVENTS.CLICK_NEW, onClickNew);
		channel.subscribe(GAME_EVENTS.BUZZ_INTENT, onBuzzIntent);
		channel.subscribe(GAME_EVENTS.CLICK_RESOLVE_INTENT, onClickResolved);
		channel.subscribe(GAME_EVENTS.CLICK_RESOLVED, onClickResolved);
		channel.subscribe(GAME_EVENTS.QUESTION_REVEAL_INTENT, onQuestionRevealed);
		channel.subscribe(GAME_EVENTS.QUESTION_REVEALED, onQuestionRevealed);
		channel.subscribe(
			GAME_EVENTS.QUESTION_ADVANCE_INTENT,
			onQuestionAdvanced,
		);
		channel.subscribe(GAME_EVENTS.QUESTION_ADVANCED, onQuestionAdvanced);
		channel.subscribe(GAME_EVENTS.GAME_COMPLETE_INTENT, onGameCompleted);
		channel.subscribe(GAME_EVENTS.GAME_ENDED, onGameCompleted);
		channel.subscribe(GAME_EVENTS.GAME_PAUSED, onGamePaused);
		channel.subscribe(GAME_EVENTS.GAME_RESUMED, onGameResumed);

		return () => {
			channel.unsubscribe(GAME_EVENTS.PLAYER_JOINED, onPlayerJoined);
			channel.unsubscribe(GAME_EVENTS.PLAYER_LEFT, onPlayerLeft);
			channel.unsubscribe(GAME_EVENTS.GAME_STARTED, onGameStarted);
			channel.unsubscribe(GAME_EVENTS.CLICK_NEW, onClickNew);
			channel.unsubscribe(GAME_EVENTS.BUZZ_INTENT, onBuzzIntent);
			channel.unsubscribe(
				GAME_EVENTS.CLICK_RESOLVE_INTENT,
				onClickResolved,
			);
			channel.unsubscribe(GAME_EVENTS.CLICK_RESOLVED, onClickResolved);
			channel.unsubscribe(
				GAME_EVENTS.QUESTION_REVEAL_INTENT,
				onQuestionRevealed,
			);
			channel.unsubscribe(GAME_EVENTS.QUESTION_REVEALED, onQuestionRevealed);
			channel.unsubscribe(
				GAME_EVENTS.QUESTION_ADVANCE_INTENT,
				onQuestionAdvanced,
			);
			channel.unsubscribe(GAME_EVENTS.QUESTION_ADVANCED, onQuestionAdvanced);
			channel.unsubscribe(
				GAME_EVENTS.GAME_COMPLETE_INTENT,
				onGameCompleted,
			);
			channel.unsubscribe(GAME_EVENTS.GAME_ENDED, onGameCompleted);
			channel.unsubscribe(GAME_EVENTS.GAME_PAUSED, onGamePaused);
			channel.unsubscribe(GAME_EVENTS.GAME_RESUMED, onGameResumed);

			channel.presence.unsubscribe("leave", onPresenceLeave);
			channel.presence.unsubscribe("enter", onPresenceEnter);

			client.connection.off("connected", onConnectionConnected);

			channel.presence.leave().catch(() => {
				// leaving is best-effort
			});
		};
	}, [code, queryClient, navigate]);
}
