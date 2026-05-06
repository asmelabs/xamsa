import { PausedBanner } from "@/components/paused-banner";
import { useHostShortcuts } from "@/hooks/use-host-shortcuts";
import type { GameData } from "@/lib/game-types";
import { BuzzQueueCard, BuzzQueueHostStrip } from "./buzz-queue-card";
import { CurrentQuestionCard } from "./current-question-card";
import { GameCompletionBanner } from "./game-completion-banner";
import { GameHeader } from "./game-header";
import { HostControls } from "./host-controls";
import { HostDuplicateBuzzBanner } from "./host-duplicate-buzz-banner";
import { HostShortcutsHelp } from "./host-shortcuts-help";
import { PlayersPanel } from "./players-panel";
import { StartGameCard } from "./start-game-card";

interface HostViewProps {
	game: GameData;
}

export function HostView({ game }: HostViewProps) {
	const activePlayers = game.players.filter((p) => p.status === "playing");
	const { helpOpen, openHelp, closeHelp } = useHostShortcuts(game);

	return (
		<div className="mx-auto max-w-7xl space-y-4 p-4">
			<GameHeader game={game} />

			{game.status === "paused" && <PausedBanner pausedAt={game.pausedAt} />}

			<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
				<div className="min-w-0 max-w-full space-y-4">
					{game.status === "waiting" ? (
						<StartGameCard game={game} activePlayers={activePlayers} />
					) : game.status === "completed" ? (
						<GameCompletionBanner game={game} />
					) : (
						<>
							<div className="flex items-center justify-end">
								<HostShortcutsHelp
									open={helpOpen}
									onOpenChange={(o) => (o ? openHelp() : closeHelp())}
								/>
							</div>
							<HostControls game={game} />
							{game.status === "active" && (
								<HostDuplicateBuzzBanner game={game} />
							)}
							{game.status === "active" && <BuzzQueueHostStrip game={game} />}
							<CurrentQuestionCard game={game} isHostView />
							<BuzzQueueCard game={game} isHostView />
						</>
					)}
				</div>

				<div className="space-y-4">
					<PlayersPanel
						players={activePlayers}
						isHostView
						gameCode={game.code}
					/>
					{game.status === "active" || game.status === "paused" ? (
						<div className="rounded-md border border-border bg-muted/30 p-3 text-muted-foreground text-xs">
							Press{" "}
							<kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px]">
								?
							</kbd>{" "}
							anywhere to see host keyboard shortcuts.
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
