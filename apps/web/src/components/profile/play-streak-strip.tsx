import type { GetPublicPlayStreakOutputType } from "@xamsa/schemas/modules/user";
import { FlameIcon, TrophyIcon } from "lucide-react";

interface PlayStreakStripProps {
	data: GetPublicPlayStreakOutputType;
	/** How many recent days to render in the strip (defaults to 30). */
	stripLength?: number;
}

const DEFAULT_STRIP_LENGTH = 30;

function intensityClass(count: number): string {
	if (count <= 0) return "bg-muted/40 dark:bg-muted/20 border border-border/60";
	if (count === 1) return "bg-primary/35";
	if (count === 2) return "bg-primary/55";
	if (count === 3) return "bg-primary/75";
	return "bg-primary";
}

function formatHumanDate(iso: string): string {
	const d = new Date(`${iso}T00:00:00Z`);
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

/**
 * Compact daily streak strip for the profile Progress section. Each cell is
 * one day in UTC; the trailing cells are the most recent. Tooltip-light
 * (uses native `title`) so it stays low-cost on mobile.
 */
export function PlayStreakStrip({
	data,
	stripLength = DEFAULT_STRIP_LENGTH,
}: PlayStreakStripProps) {
	const days =
		data.last60.length > stripLength
			? data.last60.slice(data.last60.length - stripLength)
			: data.last60;

	const totalGames = days.reduce((acc, d) => acc + d.count, 0);

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:col-span-2">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
						<FlameIcon className="size-3.5" strokeWidth={1.75} />
						<span>Play streak</span>
					</div>
					<p className="font-semibold text-foreground text-lg leading-tight">
						{data.current === 0
							? "No streak yet"
							: data.current === 1
								? "1 day"
								: `${data.current.toLocaleString()} days`}
					</p>
				</div>
				<div className="flex items-center gap-3 text-muted-foreground text-xs">
					<span className="inline-flex items-center gap-1.5">
						<TrophyIcon className="size-3.5" strokeWidth={1.75} />
						<span className="tabular-nums">
							Best {data.longest.toLocaleString()}
						</span>
					</span>
					<span className="tabular-nums">
						{totalGames.toLocaleString()} {totalGames === 1 ? "game" : "games"}{" "}
						in {stripLength}d
					</span>
				</div>
			</div>
			<div className="flex w-full items-end gap-1 overflow-x-auto pb-1">
				{days.map((day) => {
					const tooltip = `${formatHumanDate(day.date)} · ${day.count} ${
						day.count === 1 ? "game" : "games"
					}`;
					return (
						<span
							key={day.date}
							title={tooltip}
							aria-label={tooltip}
							className={`h-6 min-w-2 flex-1 rounded-sm transition-colors ${intensityClass(
								day.count,
							)}`}
						/>
					);
				})}
			</div>
			<div className="flex items-center justify-between text-[11px] text-muted-foreground">
				<span>Older</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="size-2 rounded-sm bg-muted/60" aria-hidden />
					<span className="size-2 rounded-sm bg-primary/35" aria-hidden />
					<span className="size-2 rounded-sm bg-primary/55" aria-hidden />
					<span className="size-2 rounded-sm bg-primary/75" aria-hidden />
					<span className="size-2 rounded-sm bg-primary" aria-hidden />
				</span>
				<span>Today</span>
			</div>
		</div>
	);
}
