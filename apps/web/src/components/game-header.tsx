// src/components/game-header.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Menu,
	MenuItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "@xamsa/ui/components/menu";
import {
	CopyIcon,
	DoorOpenIcon,
	EllipsisIcon,
	FlagIcon,
	LogOutIcon,
	ZapIcon,
} from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import type { GameData } from "@/lib/game-types";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { LoadingButton } from "./loading-button";

const statusConfig = {
	waiting: { label: "Waiting for players", variant: "outline" as const },
	active: { label: "Live", variant: "success" as const },
	paused: { label: "Paused", variant: "warning" as const },
	completed: { label: "Completed", variant: "info" as const },
};

interface GameHeaderProps {
	game: GameData;
}

export function GameHeader({ game }: GameHeaderProps) {
	const { copy } = useCopyToClipboard();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const [endGameOpen, setEndGameOpen] = useQueryState(
		"end-game",
		parseAsBoolean.withDefault(false),
	);
	const [leaveOpen, setLeaveOpen] = useQueryState(
		"leave-game",
		parseAsBoolean.withDefault(false),
	);

	const handleCopyCode = () => {
		copy(game.code);
		toast.success("Code copied");
	};

	const queryKey = orpc.game.findOne.queryKey({ input: { code: game.code } });

	const { mutate: endGame, isPending: isEnding } = useMutation({
		...orpc.game.leaveAsHost.mutationOptions(),
		onSuccess() {
			setEndGameOpen(null);
			toast.success("Game ended");
			queryClient.invalidateQueries({ queryKey });
		},
		onError(error) {
			toast.error(error.message || "Failed to end the game");
		},
	});

	const { mutate: leaveGame, isPending: isLeaving } = useMutation({
		...orpc.player.leave.mutationOptions(),
		onSuccess() {
			setLeaveOpen(null);
			toast.success("You left the game");
			navigate({ to: "/" });
		},
		onError(error) {
			toast.error(error.message || "Failed to leave the game");
		},
	});

	const status = statusConfig[game.status];
	const isCompleted = game.status === "completed";
	const canShowHostEnd = game.isHost && !isCompleted;
	const canShowPlayerLeave =
		!game.isHost && !!game.myPlayer && game.myPlayer.status === "playing";

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-4">
			<div className="flex items-center gap-3">
				<div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
					<ZapIcon className="size-5 text-primary" />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h1 className="font-bold text-base tracking-tight">
							{game.pack.name}
						</h1>
						<Badge variant={status.variant}>
							{game.status === "active" && (
								<span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-current" />
							)}
							{status.label}
						</Badge>
					</div>
					{game.currentTopicOrder && game.currentQuestionOrder && (
						<p className="text-muted-foreground text-xs">
							Topic {game.currentTopicOrder} · Question{" "}
							{game.currentQuestionOrder}
						</p>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handleCopyCode}
					className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm transition-colors hover:bg-muted"
				>
					{game.code}
					<CopyIcon className="size-3.5 text-muted-foreground" />
				</button>

				{(canShowHostEnd || canShowPlayerLeave) && (
					<Menu>
						<MenuTrigger render={<Button variant="outline" size="icon-sm" />}>
							<EllipsisIcon />
						</MenuTrigger>
						<MenuPopup align="end">
							{canShowHostEnd && (
								<>
									<MenuItem
										variant="destructive"
										onClick={() => setEndGameOpen(true)}
									>
										<FlagIcon />
										End game
									</MenuItem>
									<MenuSeparator />
									<MenuItem render={<Link to="/" />}>
										<DoorOpenIcon />
										Back to home
									</MenuItem>
								</>
							)}
							{canShowPlayerLeave && (
								<MenuItem
									variant="destructive"
									onClick={() => setLeaveOpen(true)}
								>
									<LogOutIcon />
									Leave game
								</MenuItem>
							)}
						</MenuPopup>
					</Menu>
				)}
			</div>

			{canShowHostEnd && (
				<BetterDialog
					opened={endGameOpen}
					setOpened={(open) => setEndGameOpen(open ?? false)}
					title="End this game?"
					description="The current question will be marked as skipped. Final stats will be calculated from the scores so far."
					submit={
						<LoadingButton
							type="button"
							variant="destructive"
							isLoading={isEnding}
							loadingText="Ending..."
							onClick={() => endGame({ code: game.code })}
						>
							<FlagIcon />
							End game now
						</LoadingButton>
					}
				>
					<p className="text-muted-foreground text-sm">
						Once ended, nobody can buzz or answer again. Players will see the
						final scoreboard.
					</p>
				</BetterDialog>
			)}

			{canShowPlayerLeave && (
				<BetterDialog
					opened={leaveOpen}
					setOpened={(open) => setLeaveOpen(open ?? false)}
					title="Leave this game?"
					description="You won't be able to buzz again. You can rejoin from the game code if the host still has it open."
					submit={
						<LoadingButton
							type="button"
							variant="destructive"
							isLoading={isLeaving}
							loadingText="Leaving..."
							onClick={() => leaveGame({ code: game.code })}
						>
							<LogOutIcon />
							Leave game
						</LoadingButton>
					}
				>
					<p className="text-muted-foreground text-sm">
						Your current score and stats are kept on the final scoreboard.
					</p>
				</BetterDialog>
			)}
		</div>
	);
}
