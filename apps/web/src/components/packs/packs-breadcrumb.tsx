import { Link, type LinkProps } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import { cn } from "@xamsa/ui/lib/utils";
import { ChevronRightIcon } from "lucide-react";

export type PacksBreadcrumbItem =
	| (Pick<LinkProps, "to" | "params" | "search"> & { label: string })
	| { label: string; current: true };

type PacksBreadcrumbProps = {
	items: PacksBreadcrumbItem[];
	className?: string;
};

/**
 * Breadcrumb row for pack editor / detail sub-routes. First segment is a ghost back-style control.
 */
export function PacksBreadcrumb({ items, className }: PacksBreadcrumbProps) {
	if (items.length === 0) {
		return null;
	}

	return (
		<nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
			<ol className="flex min-w-0 flex-wrap items-center gap-1 text-muted-foreground text-sm">
				{items.map((item, i) => (
					<li
						className="flex min-w-0 max-w-full items-center gap-1"
						key={"to" in item ? `link-${String(item.to)}-${i}` : `text-${i}`}
					>
						{i > 0 && (
							<ChevronRightIcon
								aria-hidden
								className="size-3.5 shrink-0 text-muted-foreground/60"
							/>
						)}
						{"to" in item ? (
							<Button
								variant="ghost"
								size="sm"
								className="h-auto min-w-0 max-w-full px-1.5 py-0.5 font-normal"
								render={
									<Link
										to={item.to}
										params={item.params}
										search={item.search}
									/>
								}
							>
								<span className="truncate">{item.label}</span>
							</Button>
						) : (
							<span
								className={cn("px-1.5 py-0.5", "font-medium text-foreground")}
							>
								<span className="line-clamp-2 break-words">{item.label}</span>
							</span>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
