import { Badge } from "@xamsa/ui/components/badge";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { CrownIcon, TrophyIcon } from "lucide-react";
import type { GameData } from "@/lib/game-types";
import {
	competitionRanksForSortedPlayers,
	sortGamePlayersForScoreboard,
} from "@/lib/sort-game-players";

interface GameCompletionBannerProps {
	game: GameData;
}

export function GameCompletionBanner({ game }: GameCompletionBannerProps) {
	const winner = game.winnerId
		? game.players.find((p) => p.id === game.winnerId)
		: null;

	const sortedPlayers = sortGamePlayersForScoreboard(game.players);
	const computedRanks = competitionRanksForSortedPlayers(sortedPlayers);
	const rankByPlayerId = new Map(
		sortedPlayers.map((p, i) => [p.id, computedRanks[i] ?? i + 1]),
	);

	return (
		<Frame>
			<FrameHeader className="flex items-center justify-between">
				<FrameTitle>
					<TrophyIcon className="mr-2 inline size-4 text-amber-500" />
					Game complete
				</FrameTitle>
				<Badge variant="outline">Final scoreboard</Badge>
			</FrameHeader>
			<FramePanel className="space-y-4">
				{winner ? (
					<div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
						<div className="flex size-10 items-center justify-center rounded-full bg-amber-500/20">
							<CrownIcon className="size-5 text-amber-600 dark:text-amber-400" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-amber-700 text-xs uppercase tracking-wide dark:text-amber-400">
								Winner
							</p>
							<p className="truncate font-bold text-lg">{winner.user.name}</p>
						</div>
						<p className="font-bold text-2xl">
							{winner.score.toLocaleString()}
						</p>
					</div>
				) : (
					<p className="rounded-lg border border-border bg-muted/30 p-3 text-center text-muted-foreground text-sm">
						No winner recorded.
					</p>
				)}

				<div className="space-y-1.5">
					{sortedPlayers.map((player) => {
						const rank = player.rank ?? rankByPlayerId.get(player.id) ?? 0;
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
								className="flex items-center gap-3 rounded-xl border border-border p-2.5"
							>
								<div
									className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-semibold text-xs ${rankBadge}`}
								>
									{rank}
								</div>
								<p className="min-w-0 flex-1 truncate font-medium text-sm">
									{player.user.name}
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
	);
}
