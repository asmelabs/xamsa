import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "@xamsa/ui/components/tooltip";
import { cn } from "@xamsa/ui/lib/utils";

import type { PresenceState } from "@/hooks/use-game-presence";

const STATE_LABEL: Record<PresenceState, string> = {
	online: "Online",
	away: "Away",
	offline: "Offline",
};

const STATE_TOOLTIP: Record<PresenceState, string> = {
	online: "On the game right now",
	away: "Tab is hidden — they're still connected",
	offline: "Not on the game",
};

const SIZE_CLASS = {
	sm: "size-2",
	md: "size-2.5",
	lg: "size-3",
} as const;

type Size = keyof typeof SIZE_CLASS;

/**
 * Tiny status indicator for a host or player. Green = online + visible,
 * orange = present but tab hidden, grey = not in the channel.
 */
export function PresenceDot({
	state,
	size = "md",
	className,
}: {
	state: PresenceState;
	size?: Size;
	className?: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span
						aria-label={`Presence: ${STATE_LABEL[state]}`}
						className={cn(
							"inline-flex shrink-0 items-center justify-center",
							className,
						)}
					>
						<span
							aria-hidden
							className={cn(
								"rounded-full ring-2 ring-background",
								SIZE_CLASS[size],
								state === "online" && "bg-emerald-500 dark:bg-emerald-400",
								state === "away" && "bg-amber-500 dark:bg-amber-400",
								state === "offline" && "bg-muted-foreground/40",
							)}
						/>
					</span>
				}
			/>
			<TooltipPopup>{STATE_TOOLTIP[state]}</TooltipPopup>
		</Tooltip>
	);
}
