import type { GameData } from "@/lib/game-types";
import { BuzzQueueCard } from "./buzz-queue-card";
import { CurrentQuestionCard } from "./current-question-card";
import { GameCompletionBanner } from "./game-completion-banner";
import { GameHeader } from "./game-header";
import { HostControls } from "./host-controls";
import { PausedBanner } from "@/components/paused-banner";
import { PlayersPanel } from "./players-panel";
import { StartGameCard } from "./start-game-card";

interface HostViewProps {
	game: GameData;
}

export function HostView({ game }: HostViewProps) {
	const activePlayers = game.players.filter((p) => p.status === "playing");

	return (
		<div className="mx-auto max-w-7xl space-y-4 p-4">
			<GameHeader game={game} />

			{game.status === "paused" && <PausedBanner pausedAt={game.pausedAt} />}

			<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
				<div className="space-y-4">
					{game.status === "waiting" ? (
						<StartGameCard game={game} activePlayers={activePlayers} />
					) : game.status === "completed" ? (
						<GameCompletionBanner game={game} />
					) : (
						<>
							<HostControls game={game} />
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
				</div>
			</div>
		</div>
	);
}
