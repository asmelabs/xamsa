import { PauseIcon } from "lucide-react";

interface PausedBannerProps {
	pausedAt: Date | string | null | undefined;
}

export function PausedBanner({ pausedAt }: PausedBannerProps) {
	const since = pausedAt
		? new Date(pausedAt).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			})
		: null;

	return (
		<div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
			<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
				<PauseIcon className="size-4 text-amber-600 dark:text-amber-400" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="font-semibold text-amber-700 text-sm dark:text-amber-400">
					Game paused
				</p>
				<p className="text-amber-700/80 text-xs dark:text-amber-400/80">
					{since
						? `Paused since ${since}. Waiting for the host to resume.`
						: "Waiting for the host to resume."}
				</p>
			</div>
		</div>
	);
}
