import { useMutation, useQueryClient } from "@tanstack/react-query";
import { channels, GAME_EVENTS } from "@xamsa/ably/channels";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { CheckIcon, CircleIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import {
	applyClickResolvedToGame,
	type ClickResolvedData,
} from "@/hooks/use-game-channel";
import { getAblyClient } from "@/lib/ably";
import type { GameData } from "@/lib/game-types";
import { orpc } from "@/utils/orpc";

interface BuzzQueueCardProps {
	game: GameData;
	isHostView: boolean;
}

export function BuzzQueueCard({ game, isHostView }: BuzzQueueCardProps) {
	const queryClient = useQueryClient();

	// Use host click details if available, fall back to public clicks
	const clicks =
		isHostView && game.hostData ? game.hostData.clickDetails : game.clicks;

	const { mutate: resolve, isPending: isResolving } = useMutation({
		...orpc.click.resolve.mutationOptions(),
		onError(error) {
			toast.error(error.message || "Failed to resolve click");
			// server remains source of truth; invalidate to reconcile
			queryClient.invalidateQueries({
				queryKey: orpc.game.findOne.queryKey({ input: { code: game.code } }),
			});
		},
	});

	const handleResolve = (
		clickId: string,
		resolution: "correct" | "wrong",
		playerId: string,
	) => {
		if (isResolving) return;

		const currentOrder = game.currentQuestion?.order ?? 0;
		const points = currentOrder * 100;
		const pointsAwarded = resolution === "correct" ? points : -points;

		const queryKey = orpc.game.findOne.queryKey({ input: { code: game.code } });
		const previous = queryClient.getQueryData<GameData>(queryKey);

		// Build the optimistic CLICK_RESOLVED payload. The precise stats come from
		// the server broadcast, but the main click status + the cascaded expired
		// ids already land correctly and will be reconciled when the authoritative
		// event arrives.
		if (previous) {
			const expiredClicks =
				resolution === "correct"
					? previous.clicks
							.filter((c) => c.status === "pending" && c.id !== clickId)
							.map((c) => ({ id: c.id, playerId: c.playerId }))
					: [];

			const resolverScore =
				(previous.players.find((p) => p.id === playerId)?.score ?? 0) +
				pointsAwarded;

			// Compute reveal with the same rules as the server:
			//  - correct => always reveal
			//  - wrong   => reveal only if the queue is exhausted (no pending left
			//    AND every active player already has a non-pending click)
			let shouldReveal = resolution === "correct";
			if (!shouldReveal) {
				const pendingLeft = previous.clicks.filter(
					(c) => c.status === "pending" && c.id !== clickId,
				).length;

				if (pendingLeft === 0) {
					const activePlayerIds = previous.players
						.filter((p) => p.status === "playing")
						.map((p) => p.id);

					const resolvedClickPlayerIds = new Set(
						previous.clicks
							.filter((c) => {
								if (c.id === clickId) return true;
								return c.status !== "pending";
							})
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
						}
					: null;

			const optimistic: ClickResolvedData = {
				resolution,
				click: {
					id: clickId,
					playerId,
					status: resolution,
					pointsAwarded,
					answeredAt: new Date().toISOString(),
				},
				expiredClicks,
				playerScores: [
					{
						playerId,
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

			// Broadcast intent so every other client updates in ~50ms rather than
			// waiting for the server roundtrip. Fire-and-forget: the authoritative
			// CLICK_RESOLVED will reach everyone regardless.
			try {
				const client = getAblyClient();
				const channel = client.channels.get(channels.game(game.code));
				channel
					.publish(GAME_EVENTS.CLICK_RESOLVE_INTENT, optimistic)
					.catch(() => {
						// authoritative event will still arrive
					});
			} catch {
				// connection not ready — server broadcast will cover
			}
		}

		resolve({ code: game.code, clickId, resolution });
	};

	if (clicks.length === 0) {
		return (
			<Frame>
				<FrameHeader>
					<FrameTitle>Buzz queue</FrameTitle>
				</FrameHeader>
				<FramePanel>
					<div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
						<CircleIcon className="size-6" />
						<p className="text-sm">Waiting for someone to buzz...</p>
					</div>
				</FramePanel>
			</Frame>
		);
	}

	const firstPendingPosition = clicks.find(
		(c) => c.status === "pending",
	)?.position;

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>
					Buzz queue
					<span className="ml-1.5 font-normal text-muted-foreground text-sm">
						({clicks.length})
					</span>
				</FrameTitle>
			</FrameHeader>
			<FramePanel>
				<div className="space-y-1.5">
					{clicks.map((click) => {
						const player = game.players.find((p) => p.id === click.playerId);
						if (!player) return null;

						const isCurrentlyActive =
							click.status === "pending" &&
							click.position === firstPendingPosition;

						// reactionMs only available in host view
						const reactionMs = "reactionMs" in click ? click.reactionMs : null;
						const isTentative = click._isTentative === true;
						const canResolve =
							isHostView &&
							isCurrentlyActive &&
							!isTentative &&
							game.status === "active";

						const rowClass =
							click.status === "correct"
								? "border-green-500/30 bg-green-500/5"
								: click.status === "wrong"
									? "border-red-500/20 bg-red-500/5 opacity-70"
									: click.status === "expired"
										? "border-border bg-muted/40 opacity-60"
										: isCurrentlyActive
											? "border-primary/50 bg-primary/5"
											: "border-border";

						const badgeClass =
							click.status === "correct"
								? "bg-green-500/10 text-green-600 dark:text-green-400"
								: click.status === "wrong"
									? "bg-red-500/10 text-red-500"
									: click.status === "expired"
										? "bg-muted text-muted-foreground line-through"
										: isCurrentlyActive
											? "bg-primary text-primary-foreground"
											: "bg-muted text-muted-foreground";

						const statusText =
							click.status === "correct"
								? " · Correct"
								: click.status === "wrong"
									? " · Got it wrong"
									: click.status === "expired"
										? " · Expired"
										: "";

						return (
							<div
								key={click.id}
								className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${rowClass} ${
									isTentative ? "animate-pulse" : ""
								}`}
							>
								<div
									className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-semibold text-xs ${badgeClass}`}
								>
									{click.position}
								</div>

								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">
										{player.user.name}
									</p>
									<p className="text-muted-foreground text-xs">
										{reactionMs !== null && `${reactionMs}ms`}
										{statusText}
									</p>
								</div>

								{canResolve && (
									<div className="flex gap-1.5">
										<Button
											size="sm"
											variant="outline"
											className="gap-1"
											disabled={isResolving}
											onClick={() =>
												handleResolve(click.id, "wrong", click.playerId)
											}
										>
											<XIcon className="size-3.5 text-red-500" />
											Wrong
										</Button>
										<Button
											size="sm"
											className="gap-1"
											disabled={isResolving}
											onClick={() =>
												handleResolve(click.id, "correct", click.playerId)
											}
										>
											<CheckIcon className="size-3.5" />
											Correct
										</Button>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</FramePanel>
		</Frame>
	);
}
