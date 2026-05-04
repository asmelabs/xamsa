import { useMutation, useQueryClient } from "@tanstack/react-query";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { CheckIcon, ClockIcon, PauseIcon, XIcon } from "lucide-react";
import { DuplicatePolicyExplainerLink } from "@/components/duplicate-policy-explainer";
import { applyBuzzIntentToGame } from "@/hooks/use-game-channel";
import { getAblyClient } from "@/lib/ably";
import type { GameData } from "@/lib/game-types";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";

interface BuzzButtonProps {
	game: GameData;
}

export function BuzzButton({ game }: BuzzButtonProps) {
	const queryClient = useQueryClient();

	const myClick = game.myPlayer
		? game.clicks.find((c) => c.playerId === game.myPlayer?.id)
		: null;

	const hasBuzzed = !!myClick;
	const currentQuestionPoints = (game.currentQuestion?.order ?? 0) * 100;

	const canBuzz =
		game.status === "active" &&
		!game.isQuestionRevealed &&
		!!game.myPlayer &&
		game.myPlayer.status === "playing" &&
		!hasBuzzed &&
		game.currentQuestionOrder !== null &&
		!game.myDuplicateBuzzBlocked;

	const removeTentative = (code: string, intentId: string) => {
		queryClient.setQueryData<GameData | undefined>(
			orpc.game.findOne.queryKey({ input: { code } }),
			(old) => {
				if (!old) return old;
				return {
					...old,
					clicks: old.clicks.filter((c) => c._intentId !== intentId),
					hostData: old.hostData
						? {
								...old.hostData,
								clickDetails: old.hostData.clickDetails.filter(
									(c) => c._intentId !== intentId,
								),
							}
						: old.hostData,
				};
			},
		);
	};

	const { mutate: buzz, isPending } = useMutation({
		...orpc.click.buzz.mutationOptions(),
		onError(error, variables) {
			toastOrpcMutationFailure(error, "Failed to buzz");
			removeTentative(variables.code, variables.intentId);
		},
	});

	const handleBuzz = async () => {
		if (!canBuzz || !game.myPlayer) return;

		const clickedAt = Date.now();
		const intentId = crypto.randomUUID();
		const myPlayerId = game.myPlayer.id;
		const code = game.code;

		// 1. Apply optimistic update locally for instant feedback (0ms).
		//    Same helper used by the ably echo handler, so the echo is a no-op.
		queryClient.setQueryData<GameData | undefined>(
			orpc.game.findOne.queryKey({ input: { code } }),
			(old) =>
				applyBuzzIntentToGame(old, {
					intentId,
					playerId: myPlayerId,
					clickedAt,
				}),
		);

		// 2. Broadcast intent to other clients (fire and forget).
		try {
			const client = getAblyClient();
			const channel = client.channels.get(channels.game(code));
			channel
				.publish(GAME_EVENTS.BUZZ_INTENT, {
					intentId,
					playerId: myPlayerId,
					clickedAt,
				})
				.catch(() => {
					// CLICK_NEW from the server will still reach everyone.
				});
		} catch {
			// connection not ready — server broadcast will cover.
		}

		// 3. Persist to the server. Server broadcasts CLICK_NEW on success.
		buzz({ code, clickedAt, intentId });
	};

	if (myClick?.status === "correct") {
		return (
			<div className="flex h-24 w-full flex-col items-center justify-center gap-1 border border-green-500/30 bg-green-500/10">
				<div className="flex items-center gap-1.5 font-bold text-green-600 text-lg dark:text-green-400">
					<CheckIcon className="size-5" />
					Correct!
				</div>
				<p className="text-green-600/80 text-sm dark:text-green-400/80">
					+{currentQuestionPoints} points
				</p>
			</div>
		);
	}

	if (myClick?.status === "wrong") {
		return (
			<div className="flex h-24 w-full flex-col items-center justify-center gap-1 border border-red-500/30 bg-red-500/10">
				<div className="flex items-center gap-1.5 font-bold text-lg text-red-500">
					<XIcon className="size-5" />
					Wrong
				</div>
				<p className="text-red-500/80 text-sm">
					−{currentQuestionPoints} · Locked for this question
				</p>
			</div>
		);
	}

	if (myClick?.status === "expired") {
		return (
			<div className="flex h-24 w-full flex-col items-center justify-center gap-1 border border-border bg-muted/40">
				<div className="flex items-center gap-1.5 font-bold text-lg text-muted-foreground">
					<ClockIcon className="size-5" />
					Too late
				</div>
				<p className="text-muted-foreground text-sm">
					Someone else got the point
				</p>
			</div>
		);
	}

	// Paused takes precedence over "ready to buzz" so nobody races the host
	// coming back. The server also rejects paused-state clicks (see status
	// guards in the click service), so the button disabled state is just UX.
	if (game.status === "paused") {
		return (
			<div className="flex h-24 w-full flex-col items-center justify-center gap-1 border border-amber-500/30 bg-amber-500/10">
				<div className="flex items-center gap-1.5 font-bold text-amber-600 text-lg dark:text-amber-400">
					<PauseIcon className="size-5" />
					Paused
				</div>
				<p className="text-amber-600/80 text-sm dark:text-amber-400/80">
					Waiting for the host to resume
				</p>
			</div>
		);
	}

	if (
		game.myDuplicateBuzzBlocked &&
		game.status === "active" &&
		!game.isQuestionRevealed &&
		game.myPlayer?.status === "playing"
	) {
		return (
			<div className="flex min-h-24 w-full flex-col items-center justify-center gap-1 border border-muted-foreground/25 bg-muted/40 px-3 py-2">
				<p className="text-center text-muted-foreground text-sm leading-snug">
					{game.myDuplicateBuzzBlockedReason === "individual"
						? "You already played this question in a finished game with this pack — buzzing is disabled."
						: "Someone in this room already played this question in a finished game with this pack — buzzing is disabled for everyone."}
				</p>
				<DuplicatePolicyExplainerLink variant="link" label="Why am I muted?" />
			</div>
		);
	}

	if (hasBuzzed) {
		return (
			<div className="flex h-24 w-full flex-col items-center justify-center gap-1 border-2 border-primary/30 bg-primary/5">
				<p className="font-bold text-primary text-xl">
					{myClick?._isTentative ? "Buzzing..." : "Clicked!"}
				</p>
				<p className="text-muted-foreground text-sm">
					Position #{myClick?.position} in queue
				</p>
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={handleBuzz}
			disabled={!canBuzz || isPending}
			className="group relative h-24 w-full overflow-hidden bg-primary font-bold text-2xl text-primary-foreground tracking-wider shadow-lg shadow-primary/30 transition-all active:scale-[0.98] active:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
		>
			<span className="relative z-10">{isPending ? "BUZZING..." : "BUZZ"}</span>
			<div className="absolute inset-0 bg-linear-to-br from-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
		</button>
	);
}
