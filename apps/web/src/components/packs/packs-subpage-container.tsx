import { cn } from "@xamsa/ui/lib/utils";
import type React from "react";

type PacksSubpageContainerProps = {
	children: React.ReactNode;
	/** Default max-w-5xl for editor flows; use narrow for read-only subpages. */
	variant?: "default" | "narrow";
	className?: string;
};

const variantClass: Record<
	NonNullable<PacksSubpageContainerProps["variant"]>,
	string
> = {
	default: "max-w-5xl",
	narrow: "max-w-3xl",
};

/**
 * Consistent width and vertical rhythm for /packs/** subpages.
 */
export function PacksSubpageContainer({
	children,
	variant = "default",
	className,
}: PacksSubpageContainerProps) {
	return (
		<div
			className={cn(
				"container mx-auto px-4 py-8 sm:px-6 sm:py-10",
				variantClass[variant],
				className,
			)}
		>
			{children}
		</div>
	);
}
