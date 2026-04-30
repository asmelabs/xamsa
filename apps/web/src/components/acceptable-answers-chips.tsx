import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { XIcon } from "lucide-react";
import { type FocusEventHandler, forwardRef, useState } from "react";

export const ACCEPTABLE_ANSWERS_MAX_ITEMS = 5;
export const ACCEPTABLE_ANSWER_MAX_LEN = 250;

type AcceptableAnswersChipsProps = {
	value: string[] | undefined;
	onChange: (next: string[]) => void;
	onBlur: FocusEventHandler<HTMLInputElement>;
	disabled?: boolean;
	name?: string;
};

export const AcceptableAnswersChips = forwardRef<
	HTMLInputElement,
	AcceptableAnswersChipsProps
>(function AcceptableAnswersChips(
	{ value, onChange, onBlur, disabled, name },
	ref,
) {
	const [draft, setDraft] = useState("");
	const list = value ?? [];

	const tryCommit = () => {
		const t = draft.trim();
		if (!t || list.length >= ACCEPTABLE_ANSWERS_MAX_ITEMS) return;
		if (t.length > ACCEPTABLE_ANSWER_MAX_LEN) return;
		if (list.includes(t)) {
			setDraft("");
			return;
		}
		onChange([...list, t]);
		setDraft("");
	};

	const removeAt = (index: number) => {
		onChange(list.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-2">
			{list.length > 0 ? (
				<div className="flex flex-wrap gap-1.5">
					{list.map((item, i) => (
						<Badge
							key={`${item}-${i}`}
							variant="outline"
							className="gap-1 pr-1 font-normal"
						>
							<span className="max-w-48 truncate sm:max-w-64" title={item}>
								{item}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-5 shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
								disabled={disabled}
								aria-label={`Remove ${item}`}
								onClick={() => removeAt(i)}
							>
								<XIcon className="size-3" />
							</Button>
						</Badge>
					))}
				</div>
			) : null}
			<Input
				ref={ref}
				name={name}
				disabled={disabled || list.length >= ACCEPTABLE_ANSWERS_MAX_ITEMS}
				placeholder={
					list.length >= ACCEPTABLE_ANSWERS_MAX_ITEMS
						? "Maximum alternate answers reached"
						: "Type an alternate spelling or form, then press Enter"
				}
				maxLength={ACCEPTABLE_ANSWER_MAX_LEN}
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={(e) => {
					tryCommit();
					onBlur(e);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						tryCommit();
					}
				}}
			/>
			<p className="text-muted-foreground text-xs">
				Up to {ACCEPTABLE_ANSWERS_MAX_ITEMS} alternatives ({list.length}/
				{ACCEPTABLE_ANSWERS_MAX_ITEMS}). Each ≤ {ACCEPTABLE_ANSWER_MAX_LEN}{" "}
				characters.
			</p>
		</div>
	);
});
