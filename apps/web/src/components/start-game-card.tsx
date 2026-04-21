import { useMutation } from "@tanstack/react-query";
import { MIN_PLAYERS_PER_GAME_TO_START } from "@xamsa/utils/constants";
import { PlayIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import type { GameData, GamePlayer } from "@/lib/game-types";
import { orpc } from "@/utils/orpc";
import { LoadingButton } from "./loading-button";

interface StartGameCardProps {
	game: GameData;
	activePlayers: GamePlayer[];
}

export function StartGameCard({ game, activePlayers }: StartGameCardProps) {
	const { mutate: startGame, isPending } = useMutation({
		...orpc.game.start.mutationOptions(),
		onSuccess() {
			toast.success("Game started");
		},
		onError(error) {
			toast.error(error.message || "Failed to start game");
		},
	});

	const canStart = activePlayers.length >= MIN_PLAYERS_PER_GAME_TO_START;

	return (
		<div className="flex flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
			<div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
				<PlayIcon className="size-7 fill-primary text-primary" />
			</div>

			<div className="space-y-1">
				<h2 className="font-bold text-xl">Ready to host?</h2>
				<p className="text-muted-foreground text-sm">
					Share the game code with your players. When everyone's in, start the
					game.
				</p>
			</div>

			<div className="flex items-center gap-2 text-sm">
				<UsersIcon className="size-4 text-muted-foreground" />
				<span className="font-medium">
					{activePlayers.length}{" "}
					{activePlayers.length === 1 ? "player" : "players"} joined
				</span>
			</div>

			{activePlayers.length < MIN_PLAYERS_PER_GAME_TO_START && (
				<p className="text-muted-foreground text-xs">
					Waiting for at least {MIN_PLAYERS_PER_GAME_TO_START} players...
				</p>
			)}

			<LoadingButton
				size="lg"
				disabled={!canStart}
				isLoading={isPending}
				loadingText="Starting..."
				onClick={() => startGame({ code: game.code })}
			>
				<PlayIcon />
				Start game
			</LoadingButton>
		</div>
	);
}
