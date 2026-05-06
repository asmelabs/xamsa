import { useMutation, useQueryClient } from "@tanstack/react-query";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	applyClickResolvedToGame,
	applyGameCompletedToGame,
	applyGamePausedToGame,
	applyGameResumedToGame,
	applyQuestionAdvancedToGame,
	applyQuestionRevealToGame,
	type ClickResolvedData,
	type GameCompletedData,
	type QuestionAdvancedData,
	type QuestionRevealedData,
} from "@/hooks/use-game-channel";
import { getAblyClient } from "@/lib/ably";
import type { GameData } from "@/lib/game-types";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";

type Resolution = "correct" | "wrong";

/**
 * Host-only keyboard shortcuts for the live game room. Mirrors the same
 * mutations + optimistic broadcasts used by the on-screen controls so the
 * server stays the single source of truth.
 *
 * Buzzer resolution always targets the **first pending buzz** in the queue;
 * the host cannot reach past it to mark a later buzzer correct or wrong.
 *
 * Bindings (host view only):
 *  - Space    → toggle pause / resume
 *  - N or →   → advance to next question
 *  - S        → skip current question (with confirm)
 *  - F        → finish game (only on the last question)
 *  - R        → reveal the current question's answer
 *  - C        → mark the active (first pending) buzz correct
 *  - W or X   → mark the active (first pending) buzz wrong
 *  - ?        → toggle the shortcuts help dialog
 *  - Esc      → close the help dialog
 */
export function useHostShortcuts(game: GameData): {
	helpOpen: boolean;
	openHelp: () => void;
	closeHelp: () => void;
	toggleHelp: () => void;
} {
	const queryClient = useQueryClient();
	const queryKey = orpc.game.findOne.queryKey({ input: { code: game.code } });
	const [helpOpen, setHelpOpen] = useState(false);

	const isActive = game.status === "active";
	const isPaused = game.status === "paused";
	const currentTopicOrder = game.currentTopicOrder ?? 0;
	const currentQuestionOrder = game.currentQuestionOrder ?? 0;
	const orders = game.sessionTopicPackOrders;
	const lastPackTopicOrder = orders[orders.length - 1] ?? 0;
	const isLastQuestionInTopic = currentQuestionOrder >= 5;
	const isLastTopic =
		orders.length > 0 && currentTopicOrder === lastPackTopicOrder;
	const isLastQuestion = isLastQuestionInTopic && isLastTopic;

	const { mutate: advance, isPending: isAdvancing } = useMutation({
		...orpc.game.advanceQuestion.mutationOptions(),
		onSuccess(data) {
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyQuestionAdvancedToGame(old, {
					...data,
					isAuthoritative: true,
				}),
			);
			void queryClient.invalidateQueries({ queryKey });
		},
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to advance question");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const { mutate: complete, isPending: isCompleting } = useMutation({
		...orpc.game.completeGame.mutationOptions(),
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to finish game");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const { mutate: updateStatus, isPending: isTogglingPause } = useMutation({
		...orpc.game.updateStatus.mutationOptions(),
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to update game status");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const { mutate: skipQuestionMut, isPending: isSkipping } = useMutation({
		...orpc.game.skipQuestion.mutationOptions(),
		onSuccess(data) {
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyQuestionAdvancedToGame(old, {
					...data,
					isAuthoritative: true,
				}),
			);
			void queryClient.invalidateQueries({ queryKey });
		},
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to skip question");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const { mutate: resolveClickMut, isPending: isResolving } = useMutation({
		...orpc.click.resolve.mutationOptions(),
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to resolve click");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const { mutate: revealMut, isPending: isRevealing } = useMutation({
		...orpc.game.revealQuestion.mutationOptions(),
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to reveal question");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const isBusy = isAdvancing || isCompleting || isSkipping;
	const canAct = isActive && game.isQuestionRevealed && !isBusy;

	const currentQuestionClicks = game.hostData?.clickDetails ?? game.clicks;
	const hasResolvedClickOnCurrentQuestion = useMemo(
		() => currentQuestionClicks.some((c) => c.status !== "pending"),
		[currentQuestionClicks],
	);

	const canSkipQuestion =
		!isLastQuestion &&
		(isActive || isPaused) &&
		!isBusy &&
		!game.isQuestionRevealed &&
		!hasResolvedClickOnCurrentQuestion;
	const canTogglePause = (isActive || isPaused) && !isTogglingPause;

	const togglePause = useCallback(() => {
		if (!canTogglePause) return;

		const nextStatus: "active" | "paused" = isPaused ? "active" : "paused";

		queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
			nextStatus === "paused"
				? applyGamePausedToGame(old, {
						status: "paused",
						pausedAt: new Date(),
						isAuthoritative: false,
					})
				: applyGameResumedToGame(old, {
						status: "active",
						pausedAt: null,
						isAuthoritative: false,
					}),
		);

		updateStatus({ code: game.code, status: nextStatus });
	}, [
		canTogglePause,
		game.code,
		isPaused,
		queryClient,
		queryKey,
		updateStatus,
	]);

	const advanceNext = useCallback(() => {
		if (!canAct) return;

		const idx = orders.indexOf(currentTopicOrder);
		const maybeNext =
			isLastQuestionInTopic && idx >= 0 && idx < orders.length - 1
				? orders[idx + 1]
				: undefined;
		const nextTopicOrder =
			maybeNext !== undefined ? maybeNext : currentTopicOrder;
		const nextQuestionOrder = isLastQuestionInTopic
			? 1
			: currentQuestionOrder + 1;

		const optimistic: QuestionAdvancedData = {
			currentTopicOrder: nextTopicOrder,
			currentQuestionOrder: nextQuestionOrder,
			isQuestionRevealed: false,
			currentTopic: isLastQuestionInTopic ? null : game.currentTopic,
			currentQuestionPublic: {
				order: nextQuestionOrder,
				points: nextQuestionOrder * 100,
			},
			hostCurrentQuestion: null,
			isAuthoritative: false,
		};

		queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
			applyQuestionAdvancedToGame(old, optimistic),
		);

		try {
			const client = getAblyClient();
			const channel = client.channels.get(channels.game(game.code));
			channel
				.publish(GAME_EVENTS.QUESTION_ADVANCE_INTENT, optimistic)
				.catch(() => {});
		} catch {
			// server broadcast will still cover
		}

		advance({ code: game.code });
	}, [
		advance,
		canAct,
		currentQuestionOrder,
		currentTopicOrder,
		game.code,
		game.currentTopic,
		isLastQuestionInTopic,
		orders,
		queryClient,
		queryKey,
	]);

	const finishGame = useCallback(() => {
		if (!canAct) return;

		const optimistic: GameCompletedData = {
			finishedAt: new Date().toISOString(),
			winnerId: null,
			playerRanks: [],
			isAuthoritative: false,
		};

		queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
			applyGameCompletedToGame(old, optimistic),
		);

		try {
			const client = getAblyClient();
			const channel = client.channels.get(channels.game(game.code));
			channel
				.publish(GAME_EVENTS.GAME_COMPLETE_INTENT, optimistic)
				.catch(() => {});
		} catch {
			// server broadcast will still cover
		}

		complete({ code: game.code });
	}, [canAct, complete, game.code, queryClient, queryKey]);

	const skip = useCallback(() => {
		if (!canSkipQuestion) return;
		skipQuestionMut({ code: game.code });
	}, [canSkipQuestion, game.code, skipQuestionMut]);

	const hostQuestion = game.hostData?.currentQuestion;
	const canReveal =
		isActive && !game.isQuestionRevealed && !isRevealing && !!hostQuestion;

	const revealQuestion = useCallback(() => {
		if (!canReveal || !hostQuestion) return;

		const optimistic: QuestionRevealedData = {
			order: hostQuestion.order,
			text: hostQuestion.text,
			answer: hostQuestion.answer,
			explanation: hostQuestion.explanation ?? null,
			acceptableAnswers: hostQuestion.acceptableAnswers,
			isAuthoritative: false,
		};

		queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
			applyQuestionRevealToGame(old, optimistic),
		);

		try {
			const client = getAblyClient();
			const channel = client.channels.get(channels.game(game.code));
			channel
				.publish(GAME_EVENTS.QUESTION_REVEAL_INTENT, optimistic)
				.catch(() => {});
		} catch {
			// server broadcast will still cover
		}

		revealMut({ code: game.code });
	}, [canReveal, game.code, hostQuestion, queryClient, queryKey, revealMut]);

	/**
	 * Resolve the *first pending* buzz in the queue. The host can never reach
	 * past it — once #1 is wrong, #2 becomes the active buzz on its own.
	 */
	const resolveActiveBuzz = useCallback(
		(resolution: Resolution) => {
			if (isResolving) return;
			if (game.status !== "active") return;

			const sorted = [...currentQuestionClicks].sort(
				(a, b) => a.position - b.position,
			);
			const pending = sorted.filter((c) => c.status === "pending");
			const target = pending[0];
			if (!target) return;

			const currentOrder = game.currentQuestion?.order ?? 0;
			const points = currentOrder * 100;
			const pointsAwarded = resolution === "correct" ? points : -points;
			const previous = queryClient.getQueryData<GameData>(queryKey);

			if (previous) {
				const expiredClicks =
					resolution === "correct"
						? previous.clicks
								.filter((c) => c.status === "pending" && c.id !== target.id)
								.map((c) => ({ id: c.id, playerId: c.playerId }))
						: [];

				const resolverScore =
					(previous.players.find((p) => p.id === target.playerId)?.score ?? 0) +
					pointsAwarded;

				let shouldReveal = resolution === "correct";
				if (!shouldReveal) {
					const pendingLeft = previous.clicks.filter(
						(c) => c.status === "pending" && c.id !== target.id,
					).length;
					if (pendingLeft === 0) {
						const activePlayerIds = previous.players
							.filter((p) => p.status === "playing")
							.map((p) => p.id);
						const resolvedClickPlayerIds = new Set(
							previous.clicks
								.filter((c) => c.id === target.id || c.status !== "pending")
								.map((c) => c.playerId),
						);
						shouldReveal = activePlayerIds.every((pid) =>
							resolvedClickPlayerIds.has(pid),
						);
					}
				}

				const hostQ = previous.hostData?.currentQuestion;
				const questionReveal =
					shouldReveal && hostQ
						? {
								order: hostQ.order,
								text: hostQ.text,
								answer: hostQ.answer,
								explanation: hostQ.explanation ?? null,
								acceptableAnswers: hostQ.acceptableAnswers,
							}
						: null;

				const optimistic: ClickResolvedData = {
					resolution,
					click: {
						id: target.id,
						playerId: target.playerId,
						status: resolution,
						pointsAwarded,
						answeredAt: new Date().toISOString(),
					},
					expiredClicks,
					playerScores: [
						{
							playerId: target.playerId,
							score: resolverScore,
							correctAnswers: 0,
							incorrectAnswers: 0,
							expiredClicks: 0,
							currentCorrectStreak: 0,
							currentWrongStreak: 0,
							longestCorrectStreak: 0,
							longestWrongStreak: 0,
							peakScore: 0,
							lowestScore: 0,
						},
					],
					questionReveal,
					isAuthoritative: false,
				};

				queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
					applyClickResolvedToGame(old, optimistic),
				);

				try {
					const client = getAblyClient();
					const channel = client.channels.get(channels.game(game.code));
					channel
						.publish(GAME_EVENTS.CLICK_RESOLVE_INTENT, optimistic)
						.catch(() => {});
				} catch {
					// server broadcast will still cover
				}
			}

			resolveClickMut({ code: game.code, clickId: target.id, resolution });
		},
		[
			currentQuestionClicks,
			game.code,
			game.currentQuestion?.order,
			game.status,
			isResolving,
			queryClient,
			queryKey,
			resolveClickMut,
		],
	);

	const openHelp = useCallback(() => setHelpOpen(true), []);
	const closeHelp = useCallback(() => setHelpOpen(false), []);
	const toggleHelp = useCallback(() => setHelpOpen((x) => !x), []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (target) {
				const tag = target.tagName;
				if (
					tag === "INPUT" ||
					tag === "TEXTAREA" ||
					tag === "SELECT" ||
					target.isContentEditable
				) {
					return;
				}
			}
			if (event.altKey || event.metaKey || event.ctrlKey) {
				return;
			}

			if (event.key === "Escape") {
				if (helpOpen) {
					event.preventDefault();
					closeHelp();
				}
				return;
			}

			if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
				event.preventDefault();
				toggleHelp();
				return;
			}

			if (helpOpen) return;

			if (event.key === " " || event.code === "Space") {
				event.preventDefault();
				togglePause();
				return;
			}

			if (
				event.key === "n" ||
				event.key === "N" ||
				event.key === "ArrowRight"
			) {
				event.preventDefault();
				if (isLastQuestion) {
					finishGame();
				} else {
					advanceNext();
				}
				return;
			}

			if (event.key === "s" || event.key === "S") {
				event.preventDefault();
				skip();
				return;
			}

			if (event.key === "f" || event.key === "F") {
				event.preventDefault();
				if (isLastQuestion) finishGame();
				return;
			}

			if (event.key === "r" || event.key === "R") {
				event.preventDefault();
				revealQuestion();
				return;
			}

			if (event.key === "c" || event.key === "C") {
				event.preventDefault();
				resolveActiveBuzz("correct");
				return;
			}

			if (
				event.key === "w" ||
				event.key === "W" ||
				event.key === "x" ||
				event.key === "X"
			) {
				event.preventDefault();
				resolveActiveBuzz("wrong");
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [
		advanceNext,
		closeHelp,
		finishGame,
		helpOpen,
		isLastQuestion,
		resolveActiveBuzz,
		revealQuestion,
		skip,
		togglePause,
		toggleHelp,
	]);

	return { helpOpen, openHelp, closeHelp, toggleHelp };
}
