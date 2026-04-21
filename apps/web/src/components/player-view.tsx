import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import {
	Menu,
	MenuItem,
	MenuPopup,
	MenuTrigger,
} from "@xamsa/ui/components/menu";
import {
	EllipsisIcon,
	EyeOffIcon,
	LogOutIcon,
	ZapIcon,
} from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { toast } from "sonner";
import type { GameData } from "@/lib/game-types";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { BuzzButton } from "./buzz-button";
import { GameCompletionBanner } from "./game-completion-banner";
import { LoadingButton } from "./loading-button";
import { PausedBanner } from "./paused-banner";

interface PlayerViewProps {
	game: GameData;
}

export function PlayerView({ game }: PlayerViewProps) {
	const activePlayers = game.players.filter((p) => p.status === "playing");
	const sortedPlayers = [...activePlayers].sort((a, b) => b.score - a.score);

	const myRank = game.myPlayer
		? sortedPlayers.findIndex((p) => p.id === game.myPlayer?.id) + 1
		: null;

	const isCompleted = game.status === "completed";
	const canLeave =
		!game.isHost && !!game.myPlayer && game.myPlayer.status === "playing";

	const navigate = useNavigate();
	const [leaveOpen, setLeaveOpen] = useQueryState(
		"leave-game",
		parseAsBoolean.withDefault(false),
	);

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

	return (
		<div
			className={`mx-auto max-w-md space-y-4 p-4 ${
				isCompleted ? "" : "pb-32"
			}`}
		>
			{/* Top bar */}
			<div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
				<div className="flex items-center gap-2">
					<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
						<ZapIcon className="size-4 text-primary" />
					</div>
					<div>
						<p className="font-semibold text-xs">{game.pack.name}</p>
						{game.currentTopicOrder && game.currentQuestionOrder && (
							<p className="text-[10px] text-muted-foreground">
								Topic {game.currentTopicOrder} · Q{game.currentQuestionOrder}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					{game.status === "active" && (
						<Badge variant="success">
							<span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-current" />
							Live
						</Badge>
					)}
					{game.status === "paused" && (
						<Badge variant="warning">Paused</Badge>
					)}
					{game.status === "waiting" && (
						<Badge variant="outline">Waiting</Badge>
					)}
					{canLeave && (
						<Menu>
							<MenuTrigger
								render={<Button variant="ghost" size="icon-xs" />}
							>
								<EllipsisIcon className="size-3.5" />
							</MenuTrigger>
							<MenuPopup align="end">
								<MenuItem
									variant="destructive"
									onClick={() => setLeaveOpen(true)}
								>
									<LogOutIcon />
									Leave game
								</MenuItem>
							</MenuPopup>
						</Menu>
					)}
				</div>
			</div>

			{canLeave && (
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

			{game.status === "paused" && <PausedBanner pausedAt={game.pausedAt} />}

			{isCompleted && <GameCompletionBanner game={game} />}

			{/* My stats */}
			{!isCompleted && game.myPlayer && (
				<div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-xs">Your score</p>
							<p className="font-bold text-3xl">
								{game.myPlayer.score.toLocaleString()}
							</p>
						</div>
						{myRank && (
							<div className="text-right">
								<p className="text-muted-foreground text-xs">Rank</p>
								<p className="font-bold text-3xl">#{myRank}</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Current topic */}
			{!isCompleted && game.currentTopic && (
				<div className="rounded-xl border border-border bg-background p-4 text-center">
					<p className="text-muted-foreground text-xs uppercase tracking-wide">
						Current topic
					</p>
					<p className="mt-1 font-bold text-lg">{game.currentTopic.name}</p>
				</div>
			)}

			{/* Question reveal */}
			{isCompleted ? null : game.isQuestionRevealed &&
				game.currentQuestion?.text ? (
				<div className="space-y-3 rounded-xl border border-border bg-background p-4">
					<div>
						<p className="text-muted-foreground text-xs uppercase tracking-wide">
							Question
						</p>
						<p className="mt-1 font-medium">{game.currentQuestion.text}</p>
					</div>
					{game.currentQuestion.answer && (
						<div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
							<p className="text-green-700 text-xs uppercase tracking-wide dark:text-green-400">
								Answer
							</p>
							<p className="mt-1 font-semibold text-green-700 dark:text-green-400">
								{game.currentQuestion.answer}
							</p>
						</div>
					)}
				</div>
			) : (
				<div className="flex flex-col items-center gap-2 rounded-xl border border-border border-dashed bg-background p-6 text-center">
					<EyeOffIcon className="size-5 text-muted-foreground" />
					<p className="text-muted-foreground text-sm">
						Listen to the host for the question
					</p>
				</div>
			)}

			{/* Buzz queue preview */}
			{!isCompleted && game.clicks.length > 0 && (
				<div className="rounded-xl border border-border bg-background p-3">
					<p className="mb-2 text-muted-foreground text-xs uppercase tracking-wide">
						Buzz order
					</p>
					<div className="flex flex-wrap gap-1.5">
						{game.clicks.map((click) => {
							const player = game.players.find((p) => p.id === click.playerId);
							if (!player) return null;
							const isMe = click.playerId === game.myPlayer?.id;
							return (
								<div
									key={click.id}
									className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
										isMe
											? "border-primary bg-primary/10 font-medium"
											: click.status === "wrong"
												? "border-red-500/30 bg-red-500/5 text-muted-foreground line-through"
												: "border-border"
									}`}
								>
									<span className="font-semibold">{click.position}.</span>
									<span>{isMe ? "You" : player.user.name.split(" ")[0]}</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* BUZZER */}
			{!isCompleted && (
				<div className="fixed right-0 bottom-0 left-0 z-40 border-border border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-xl">
					<div className="mx-auto max-w-md">
						<BuzzButton game={game} />
					</div>
				</div>
			)}

			{/* Leaderboard */}
			{!isCompleted && (
				<Frame>
					<FrameHeader>
						<FrameTitle>Leaderboard</FrameTitle>
					</FrameHeader>
					<FramePanel>
						<div className="space-y-1.5">
							{sortedPlayers.map((player, index) => {
								const isMe = player.id === game.myPlayer?.id;
								const rank = index + 1;
								const rankBadge =
									rank === 1
										? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
										: rank === 2
											? "bg-zinc-400/10 text-zinc-500"
											: rank === 3
												? "bg-orange-700/10 text-orange-700 dark:text-orange-500"
												: "bg-muted text-muted-foreground";

								return (
									<div
										key={player.id}
										className={`flex items-center gap-3 rounded-xl border p-2.5 ${
											isMe
												? "border-primary/30 bg-primary/3"
												: "border-border"
										}`}
									>
										<div
											className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-semibold text-xs ${rankBadge}`}
										>
											{rank}
										</div>
										<p className="min-w-0 flex-1 truncate font-medium text-sm">
											{isMe ? "You" : player.user.name}
										</p>
										<p className="font-semibold text-sm">
											{player.score.toLocaleString()}
										</p>
									</div>
								);
							})}
						</div>
					</FramePanel>
				</Frame>
			)}
		</div>
	);
}
