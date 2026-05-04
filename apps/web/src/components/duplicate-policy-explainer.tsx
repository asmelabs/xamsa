import type { DuplicateQuestionPolicy } from "@xamsa/schemas/db/schemas/enums/DuplicateQuestionPolicy.schema";
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "@xamsa/ui/components/popover";
import { cn } from "@xamsa/ui/lib/utils";
import { InfoIcon } from "lucide-react";

import { DUPLICATE_POLICY_OPTIONS } from "@/lib/duplicate-policy-options";

/**
 * Side-by-side grid of all three replay-restriction modes. Used inside a
 * popover or dialog. Highlights the currently-selected mode (if any) so the
 * host can see how their pick differs from the others.
 */
export function DuplicatePolicyExplainer({
	current,
	className,
}: {
	current?: DuplicateQuestionPolicy | null;
	className?: string;
}) {
	return (
		<div className={cn("space-y-3", className)}>
			<div>
				<p className="font-semibold text-foreground text-sm">
					Spoiler-aware play
				</p>
				<p className="mt-0.5 text-muted-foreground text-xs leading-snug">
					Pick how the room handles questions someone in this lobby has already
					seen in a finished game with this pack. Nothing is enforced for the
					host outside the buzz queue — the modes only mute buzzers.
				</p>
			</div>
			<ul className="space-y-2">
				{DUPLICATE_POLICY_OPTIONS.map((opt) => {
					const isCurrent = current === opt.value;
					return (
						<li
							key={opt.value}
							className={cn(
								"rounded-lg border px-3 py-2.5",
								isCurrent
									? "border-primary/55 bg-primary/4"
									: "border-border bg-card",
							)}
						>
							<div className="flex items-baseline gap-2">
								<p className="font-medium text-foreground text-sm">
									{opt.label}
								</p>
								{isCurrent ? (
									<span className="inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary uppercase tracking-wider">
										Selected
									</span>
								) : null}
							</div>
							<dl className="mt-1.5 space-y-1 text-xs leading-snug">
								<div>
									<dt className="font-medium text-muted-foreground">
										Who's muted
									</dt>
									<dd className="text-foreground">{opt.whoIsBlocked}</dd>
								</div>
								<div>
									<dt className="font-medium text-muted-foreground">
										When to pick
									</dt>
									<dd className="text-foreground">{opt.whenToPick}</dd>
								</div>
							</dl>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

/**
 * Compact inline trigger: an "info" icon-button (with optional label) that
 * opens a popover containing the full {@link DuplicatePolicyExplainer}.
 */
export function DuplicatePolicyExplainerLink({
	current,
	label = "Learn more",
	variant = "icon",
	className,
}: {
	current?: DuplicateQuestionPolicy | null;
	label?: string;
	variant?: "icon" | "link";
	className?: string;
}) {
	return (
		<Popover>
			<PopoverTrigger
				className={cn(
					"inline-flex items-center gap-1 rounded-md text-muted-foreground text-xs transition-colors hover:text-foreground",
					variant === "icon"
						? "size-6 justify-center"
						: "underline underline-offset-2",
					className,
				)}
				aria-label={variant === "icon" ? "What does each mode do?" : undefined}
			>
				<InfoIcon className="size-3.5" strokeWidth={1.75} />
				{variant === "link" ? <span>{label}</span> : null}
			</PopoverTrigger>
			<PopoverPopup
				className="max-w-sm"
				side="bottom"
				align="start"
				sideOffset={6}
			>
				<DuplicatePolicyExplainer current={current} />
			</PopoverPopup>
		</Popover>
	);
}
