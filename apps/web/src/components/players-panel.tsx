import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import type { GamePlayer } from "@/lib/game-types";
import { PlayerRow } from "./player-row";

interface PlayersPanelProps {
	players: GamePlayer[];
	isHostView: boolean;
	gameCode?: string;
}

export function PlayersPanel({
	players,
	isHostView,
	gameCode,
}: PlayersPanelProps) {
	const sorted = [...players].sort((a, b) => b.score - a.score);

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>
					Players
					<span className="ml-1.5 font-normal text-muted-foreground text-sm">
						({players.length})
					</span>
				</FrameTitle>
			</FrameHeader>
			<FramePanel>
				{sorted.length === 0 ? (
					<p className="py-6 text-center text-muted-foreground text-sm">
						No players yet.
					</p>
				) : (
					<div className="space-y-1.5">
						{sorted.map((player, index) => (
							<PlayerRow
								key={player.id}
								player={player}
								rank={index + 1}
								isHostView={isHostView}
								gameCode={gameCode}
							/>
						))}
					</div>
				)}
			</FramePanel>
		</Frame>
	);
}
