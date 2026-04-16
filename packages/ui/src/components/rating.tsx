"use client";

import { cn } from "@xamsa/ui/lib/utils";
import { Star } from "lucide-react";
import { useState } from "react";

interface RatingProps {
	value?: number;
	onChange?: (value: number) => void;
	max?: number;
	size?: number;
	disabled?: boolean;
	readOnly?: boolean;
	icon?: React.ComponentType<{ className?: string; size?: number }>;
	activeClassName?: string;
	inactiveClassName?: string;
	className?: string;
}

export function Rating({
	value = 0,
	onChange,
	max = 5,
	size = 24,
	disabled = false,
	readOnly = false,
	icon: Icon = Star,
	activeClassName = "fill-amber-500 text-amber-500",
	inactiveClassName = "fill-transparent text-input",
	className,
}: RatingProps) {
	const [hoverValue, setHoverValue] = useState(0);

	const displayValue = hoverValue || value;
	const isInteractive = !disabled && !readOnly;

	const stars = Array.from({ length: max }, (_, i) => {
		const starValue = i + 1;

		return (
			<button
				key={starValue}
				type="button"
				disabled={!isInteractive}
				className={cn(
					"group relative rounded p-0.5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
					isInteractive && "cursor-pointer",
					!isInteractive && "cursor-default",
					disabled && "cursor-not-allowed opacity-50",
				)}
				onMouseEnter={() => isInteractive && setHoverValue(starValue)}
				onMouseLeave={() => isInteractive && setHoverValue(0)}
				onClick={() => {
					if (!isInteractive) return;
					onChange?.(value === starValue ? 0 : starValue);
				}}
				aria-label={`${starValue} ${starValue === 1 ? "star" : "stars"}`}
			>
				<Icon
					className={cn(
						"transition-all",
						displayValue >= starValue ? activeClassName : inactiveClassName,
						isInteractive && "group-hover:scale-110",
					)}
					size={size}
				/>
			</button>
		);
	});

	return (
		<div
			role={isInteractive ? "radiogroup" : "img"}
			aria-label={`Rating: ${value} out of ${max}`}
			className={cn("inline-flex gap-0", className)}
		>
			{stars}
		</div>
	);
}
