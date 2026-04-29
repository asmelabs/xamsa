import { useMutation, useQueryClient } from "@tanstack/react-query";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { Button } from "@xamsa/ui/components/button";
import { ArrowRightIcon, FlagIcon, PauseIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import {
	applyGameCompletedToGame,
	applyGamePausedToGame,
	applyGameResumedToGame,
	applyQuestionAdvancedToGame,
	type GameCompletedData,
	type QuestionAdvancedData,
} from "@/hooks/use-game-channel";
import { getAblyClient } from "@/lib/ably";
import type { GameData } from "@/lib/game-types";
import { orpc } from "@/utils/orpc";

interface HostControlsProps {
	game: GameData;
}

export function HostControls({ game }: HostControlsProps) {
	const queryClient = useQueryClient();
	const queryKey = orpc.game.findOne.queryKey({ input: { code: game.code } });

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
			// Optimistic patch, then refetch for host-only fields (e.g. duplicate-buzz notice).
			queryClient.setQueryData<GameData | undefined>(queryKey, (old) =>
				applyQuestionAdvancedToGame(old, {
					...data,
					isAuthoritative: true,
				}),
			);
			void queryClient.invalidateQueries({ queryKey });
		},
		onError(error) {
			toast.error(error.message || "Failed to advance question");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const { mutate: complete, isPending: isCompleting } = useMutation({
		...orpc.game.completeGame.mutationOptions(),
		onError(error) {
			toast.error(error.message || "Failed to finish game");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	// Pause / resume: optimistic local patch, authoritative event from server
	// overwrites with idempotent reducers.
	const { mutate: updateStatus, isPending: isTogglingPause } = useMutation({
		...orpc.game.updateStatus.mutationOptions(),
		onError(error) {
			toast.error(error.message || "Failed to update game status");
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const isBusy = isAdvancing || isCompleting;
	const canAct = isActive && game.isQuestionRevealed && !isBusy;
	const canTogglePause = (isActive || isPaused) && !isTogglingPause;

	const handleTogglePause = () => {
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
	};

	const handleNext = () => {
		if (!canAct) return;

		// Optimistic intent: clear clicks + mark isQuestionRevealed=false + bump
		// pointers. We don't yet know the next question text — the host's
		// mutation onSuccess will fill hostData.currentQuestion with the full
		// payload. Players just see the order flip.
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
			// topic info unknown at intent time if we're crossing a boundary —
			// the authoritative event will fill it.
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
	};

	const handleFinish = () => {
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
	};

	return (
		<div className="flex items-center justify-end gap-2 border border-border bg-background p-2.5">
			{(isActive || isPaused) && (
				<Button
					size="sm"
					variant="outline"
					disabled={!canTogglePause}
					onClick={handleTogglePause}
				>
					{isPaused ? (
						<>
							<PlayIcon className="size-4" />
							Resume
						</>
					) : (
						<>
							<PauseIcon className="size-4" />
							Pause
						</>
					)}
				</Button>
			)}
			{isLastQuestion ? (
				<Button
					size="sm"
					variant="destructive"
					disabled={!canAct}
					onClick={handleFinish}
				>
					<FlagIcon className="size-4" />
					Finish game
				</Button>
			) : (
				<Button size="sm" disabled={!canAct} onClick={handleNext}>
					Next question
					<ArrowRightIcon />
				</Button>
			)}
		</div>
	);
}
