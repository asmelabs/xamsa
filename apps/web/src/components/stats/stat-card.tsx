import { cn } from "@xamsa/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface StatCardProps {
	icon?: LucideIcon;
	label: string;
	value: string | number;
	hint?: ReactNode;
	delta?: number | null;
	className?: string;
}

function formatDelta(delta: number): string {
	const rounded = Math.round(delta);
	if (rounded === 0) return "±0";
	return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

/**
 * Single compact stat tile used by the home strip and profile Stats grid.
 * Smaller and denser than the legacy `StatTile`, with optional delta + hint.
 */
export function StatCard({
	icon: Icon,
	label,
	value,
	hint,
	delta,
	className,
}: StatCardProps) {
	return (
		<div
			className={cn(
				"flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-background px-2.5 py-2",
				className,
			)}
		>
			<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
				{Icon ? <Icon className="size-3" strokeWidth={1.75} /> : null}
				<span className="truncate uppercase tracking-wider">{label}</span>
			</div>
			<div className="flex items-baseline gap-2">
				<span className="font-semibold text-base text-foreground tabular-nums leading-tight">
					{value}
				</span>
				{typeof delta === "number" && delta !== 0 ? (
					<span
						className={cn(
							"font-medium text-[11px] tabular-nums",
							delta > 0 ? "text-success" : "text-destructive",
						)}
					>
						{formatDelta(delta)}
					</span>
				) : null}
			</div>
			{hint ? (
				<div className="truncate text-[11px] text-muted-foreground">{hint}</div>
			) : null}
		</div>
	);
}
