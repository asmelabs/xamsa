import { Link } from "@tanstack/react-router";
import type { RecentGameRow } from "@xamsa/schemas/modules/user";
import { formatDistanceToNow } from "date-fns";
import { CrownIcon, TrophyIcon } from "lucide-react";

interface RecentGameRowProps {
	row: RecentGameRow;
}

export function RecentGameRowItem({ row }: RecentGameRowProps) {
	const isHost = row.role === "host";
	const isWinner = !isHost && row.myRank === 1;

	return (
		<Link
			to="/g/$code"
			params={{ code: row.code }}
			className="group flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/30 hover:bg-primary/3"
		>
			<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
				{isHost ? (
					<CrownIcon className="size-4" strokeWidth={1.75} />
				) : (
					<TrophyIcon className="size-4" strokeWidth={1.75} />
				)}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<p className="truncate font-medium text-sm">{row.pack.name}</p>
					<span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">
						{isHost ? "Host" : "Player"}
					</span>
				</div>
				<p className="truncate text-muted-foreground text-xs">
					{isHost
						? row.winnerName
							? `Winner: ${row.winnerName} · ${row.totalPlayers} players`
							: `No winner · ${row.totalPlayers} players`
						: row.myRank
							? `Finished #${row.myRank} of ${row.totalPlayers} · ${row.myScore ?? 0} pts`
							: `${row.totalPlayers} players`}
				</p>
			</div>

			<div className="shrink-0 text-right">
				{isWinner && (
					<div className="font-semibold text-primary text-xs">Won</div>
				)}
				<div className="text-muted-foreground text-xs">
					{formatDistanceToNow(new Date(row.finishedAt), { addSuffix: true })}
				</div>
			</div>
		</Link>
	);
}
