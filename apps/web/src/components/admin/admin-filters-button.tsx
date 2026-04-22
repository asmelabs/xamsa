import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import { cn } from "@xamsa/ui/lib/utils";
import { FilterIcon } from "lucide-react";

type AdminFiltersButtonProps = {
	onClick: () => void;
	activeCount: number;
	className?: string;
};

export function AdminFiltersButton({
	onClick,
	activeCount,
	className,
}: AdminFiltersButtonProps) {
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={onClick}
			className={cn("relative gap-1.5", className)}
		>
			<FilterIcon className="size-4" />
			Filters
			{activeCount > 0 ? (
				<Badge
					variant="secondary"
					className="ms-0.5 h-5 min-w-5 rounded-full px-1.5"
				>
					{activeCount}
				</Badge>
			) : null}
		</Button>
	);
}
