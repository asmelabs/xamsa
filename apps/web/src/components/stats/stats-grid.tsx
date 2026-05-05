import { cn } from "@xamsa/ui/lib/utils";
import type { ReactNode } from "react";

interface StatsGridProps {
	children: ReactNode;
	className?: string;
	/** Override responsive columns. Default: 2 / 3 / 4 / 6. */
	columns?: string;
}

export function StatsGrid({ children, className, columns }: StatsGridProps) {
	return (
		<div
			className={cn(
				"grid gap-2",
				columns ?? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
				className,
			)}
		>
			{children}
		</div>
	);
}

interface StatsGroupProps {
	title: string;
	children: ReactNode;
	className?: string;
	columns?: string;
}

/** Labelled section + grid for the profile Stats tab. */
export function StatsGroup({
	title,
	children,
	className,
	columns,
}: StatsGroupProps) {
	return (
		<section className={cn("space-y-2", className)}>
			<h3 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
				{title}
			</h3>
			<StatsGrid columns={columns}>{children}</StatsGrid>
		</section>
	);
}

interface RatioFormatOptions {
	asPercent?: boolean;
	digits?: number;
	suffix?: string;
}

export function formatRatio(
	value: number | null | undefined,
	options: RatioFormatOptions = {},
): string {
	if (value == null || !Number.isFinite(value)) return "—";
	const digits = options.digits ?? (options.asPercent ? 0 : 2);
	if (options.asPercent) {
		return `${(value * 100).toFixed(digits)}%`;
	}
	return `${value.toFixed(digits)}${options.suffix ?? ""}`;
}
