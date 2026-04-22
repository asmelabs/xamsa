import { cn } from "@xamsa/ui/lib/utils";
import type React from "react";

type PacksSubpageHeaderProps = {
	eyebrow?: string;
	title: string;
	description?: string;
	actions?: React.ReactNode;
	className?: string;
};

/**
 * Title block for pack builder / sub-routes. Use with `PacksSubpageContainer` + `PacksBreadcrumb`.
 */
export function PacksSubpageHeader({
	eyebrow,
	title,
	description,
	actions,
	className,
}: PacksSubpageHeaderProps) {
	return (
		<div
			className={cn(
				"mb-8 flex flex-col gap-4 border-border border-b pb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
				className,
			)}
		>
			<div className="min-w-0 flex-1 space-y-2">
				{eyebrow ? (
					<p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
						{eyebrow}
					</p>
				) : null}
				<h1 className="font-bold font-heading text-2xl tracking-tight sm:text-3xl">
					{title}
				</h1>
				{description ? (
					<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
						{description}
					</p>
				) : null}
			</div>
			{actions ? (
				<div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
					{actions}
				</div>
			) : null}
		</div>
	);
}
