import type { LucideIcon } from "lucide-react";

interface StatTileProps {
	icon: LucideIcon;
	label: string;
	value: string | number;
	hint?: string;
}

export function StatTile({ icon: Icon, label, value, hint }: StatTileProps) {
	return (
		<div className="flex flex-col gap-1 rounded-xl border border-border bg-background p-3">
			<div className="flex items-center gap-2 text-muted-foreground text-xs">
				<Icon className="size-3.5" strokeWidth={1.75} />
				<span className="uppercase tracking-wider">{label}</span>
			</div>
			<div className="font-semibold text-foreground text-lg leading-tight">
				{value}
			</div>
			{hint && <div className="text-muted-foreground text-xs">{hint}</div>}
		</div>
	);
}
