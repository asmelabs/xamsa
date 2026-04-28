import { InfoIcon } from "lucide-react";
import type { GameData } from "@/lib/game-types";

export function HostDuplicateBuzzBanner({ game }: { game: GameData }) {
	const notice = game.hostDuplicateBuzzNotice;
	if (!notice || !game.isHost) {
		return null;
	}

	const names = notice.affectedPlayers.map((p) => p.displayName);

	if (notice.mode === "room") {
		return (
			<div className="flex gap-3 rounded-lg border border-muted-foreground/25 bg-muted/40 px-3 py-2.5 text-sm">
				<InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
				<div className="space-y-1 text-muted-foreground leading-snug">
					<p>
						Someone in this room already played this question in a finished game
						with this pack — buzzing is disabled for everyone.
					</p>
					{names.length > 0 && (
						<p>
							<span className="font-medium text-foreground">
								Players with prior exposure on this question:
							</span>{" "}
							{names.join(", ")}
						</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex gap-3 rounded-lg border border-muted-foreground/25 bg-muted/40 px-3 py-2.5 text-sm">
			<InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			<div className="space-y-1 text-muted-foreground leading-snug">
				<p>
					The following players already played this question in a finished game
					with this pack — buzzing is disabled for them on this question:
				</p>
				<p className="font-medium text-foreground">{names.join(", ")}</p>
			</div>
		</div>
	);
}
