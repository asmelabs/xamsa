import { Button } from "@xamsa/ui/components/button";
import { KeyboardIcon } from "lucide-react";
import { BetterDialog } from "./better-dialog";

interface HostShortcutsHelpProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type Row = { keys: string[]; label: string };

const ROWS: Row[] = [
	{ keys: ["Space"], label: "Pause / resume the game" },
	{ keys: ["N", "→"], label: "Next question (or finish on last)" },
	{ keys: ["R"], label: "Reveal the current question's answer" },
	{ keys: ["C"], label: "Mark the active buzz correct" },
	{ keys: ["W", "X"], label: "Mark the active buzz wrong" },
	{ keys: ["S"], label: "Skip current question" },
	{ keys: ["F"], label: "Finish game (last question only)" },
	{ keys: ["?"], label: "Open this cheat sheet" },
	{ keys: ["Esc"], label: "Close this cheat sheet" },
];

export function HostShortcutsHelp({
	open,
	onOpenChange,
}: HostShortcutsHelpProps) {
	return (
		<BetterDialog
			opened={open}
			setOpened={(o) => onOpenChange(o ?? false)}
			trigger={
				<Button
					variant="outline"
					size="icon-xs"
					title="Host keyboard shortcuts (?)"
					aria-label="Host keyboard shortcuts"
				>
					<KeyboardIcon className="size-4" />
				</Button>
			}
			title="Host keyboard shortcuts"
			description="Drive a live game without ever leaving the keyboard. Tap the keys below in any input-free area of the host view."
			panelClassName="space-y-3"
		>
			<dl className="space-y-2">
				{ROWS.map((row) => (
					<div
						key={row.label}
						className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
					>
						<dt className="text-foreground text-sm">{row.label}</dt>
						<dd className="flex shrink-0 items-center gap-1">
							{row.keys.map((key) => (
								<span
									key={`${row.label}-${key}`}
									className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-foreground"
								>
									{key}
								</span>
							))}
						</dd>
					</div>
				))}
			</dl>
			<p className="text-muted-foreground text-xs">
				Shortcuts are skipped while you're typing in a field or dialog. Correct
				and wrong always target the first pending buzz — once it's resolved, the
				next pending buzz becomes the active one on its own.
			</p>
		</BetterDialog>
	);
}
