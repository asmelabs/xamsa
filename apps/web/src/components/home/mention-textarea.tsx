"use client";

import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@xamsa/ui/components/textarea";
import { cn } from "@xamsa/ui/lib/utils";
import {
	type ComponentProps,
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export type MentionTextareaProps = Omit<
	ComponentProps<typeof Textarea>,
	"value" | "onChange" | "defaultValue"
> & {
	value: string;
	onValueChange: (next: string) => void;
};

/** Caret is the textarea `selectionStart` (end of mention token when typing). */
function getMentionContext(
	text: string,
	caret: number,
): { start: number; prefix: string } | null {
	if (caret < 1) return null;
	let k = caret - 1;
	while (k >= 0) {
		const ch = text[k];
		if (ch === undefined || !/[a-zA-Z0-9]/.test(ch)) {
			break;
		}
		k--;
	}
	if (k < 0 || text[k] !== "@") return null;
	if (k > 0) {
		const prev = text[k - 1];
		if (prev === undefined || !/\s/.test(prev)) return null;
	}
	const raw = text.slice(k + 1, caret);
	if (raw.length > 30) return null;
	if (raw.length > 0 && !/^[a-zA-Z][a-zA-Z0-9]*$/.test(raw)) return null;
	return { start: k, prefix: raw.toLowerCase() };
}

export const MentionTextarea = forwardRef<
	HTMLTextAreaElement,
	MentionTextareaProps
>(function MentionTextareaInner(
	{
		value,
		onValueChange,
		onKeyDown,
		onSelect,
		onClick,
		onKeyUp,
		className,
		...textareaRest
	},
	ref,
) {
	const taRef = useRef<HTMLTextAreaElement | null>(null);
	const setTextareaRef = useCallback(
		(el: HTMLTextAreaElement | null) => {
			taRef.current = el;
			if (ref == null) {
				return;
			}
			if (typeof ref === "function") {
				ref(el);
			} else {
				ref.current = el;
			}
		},
		[ref],
	);
	const { data: session } = authClient.useSession();
	const [caret, setCaret] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const ctx = useMemo(() => getMentionContext(value, caret), [value, caret]);

	const mentionQuery = useQuery({
		...orpc.user.mentionCandidates.queryOptions({
			input: { prefix: ctx?.prefix ?? "", limit: 8 },
		}),
		enabled: Boolean(session?.user && ctx),
		staleTime: 15_000,
	});

	const items = mentionQuery.data?.items ?? [];
	const showMenu = Boolean(
		session?.user && ctx && (mentionQuery.isFetching || items.length > 0),
	);
	const activeIndex =
		items.length === 0
			? 0
			: Math.min(selectedIndex, Math.max(0, items.length - 1));

	const applyMention = useCallback(
		(username: string) => {
			const ta = taRef.current;
			if (!ctx || !ta) return;
			const before = value.slice(0, ctx.start);
			const after = value.slice(caret);
			const insert = `@${username} `;
			const next = before + insert + after;
			const newPos = before.length + insert.length;
			onValueChange(next);
			queueMicrotask(() => {
				ta.setSelectionRange(newPos, newPos);
				setCaret(newPos);
			});
		},
		[caret, ctx, onValueChange, value],
	);

	const mentionResetKey = ctx ? `${ctx.start}:${ctx.prefix}` : "";

	// biome-ignore lint/correctness/useExhaustiveDependencies: selection must reset when the active @-mention changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [mentionResetKey]);

	useEffect(() => {
		if (selectedIndex >= items.length && items.length > 0) {
			setSelectedIndex(0);
		}
	}, [items.length, selectedIndex]);

	return (
		<div className="relative w-full">
			<Textarea
				ref={setTextareaRef}
				className={className}
				{...textareaRest}
				value={value}
				onChange={(e) => {
					setCaret(e.target.selectionStart);
					onValueChange(e.target.value);
				}}
				onSelect={(e) => {
					setCaret(e.currentTarget.selectionStart);
					onSelect?.(e);
				}}
				onClick={(e) => {
					setCaret(e.currentTarget.selectionStart);
					onClick?.(e);
				}}
				onKeyUp={(e) => {
					setCaret(e.currentTarget.selectionStart);
					onKeyUp?.(e);
				}}
				onKeyDown={(e) => {
					if (
						showMenu &&
						items.length > 0 &&
						(e.key === "ArrowDown" || e.key === "ArrowUp")
					) {
						e.preventDefault();
						if (e.key === "ArrowDown") {
							setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
						} else {
							setSelectedIndex((i) => Math.max(i - 1, 0));
						}
						return;
					}
					if (showMenu && items.length > 0 && e.key === "Enter") {
						e.preventDefault();
						const u = items[activeIndex]?.username;
						if (u) applyMention(u);
						return;
					}
					if (showMenu && items.length > 0 && e.key === "Tab" && !e.shiftKey) {
						e.preventDefault();
						const u = items[activeIndex]?.username;
						if (u) applyMention(u);
						return;
					}
					onKeyDown?.(e);
				}}
			/>
			{showMenu ? (
				<div className="absolute top-full left-0 z-50 mt-1 max-h-48 min-w-[12rem] max-w-[min(100%,20rem)] overflow-y-auto rounded-lg border bg-popover py-1 text-popover-foreground text-sm shadow-md">
					{mentionQuery.isFetching && items.length === 0 ? (
						<div className="px-3 py-2 text-muted-foreground">Loading…</div>
					) : null}
					{items.map((u, index) => (
						<button
							type="button"
							key={u.username}
							className={cn(
								"flex w-full items-baseline gap-2 px-3 py-1.5 text-left",
								index === activeIndex ? "bg-accent" : "hover:bg-accent/60",
							)}
							onMouseDown={(ev) => {
								ev.preventDefault();
								applyMention(u.username);
							}}
						>
							<span className="font-medium">@{u.username}</span>
							{u.name ? (
								<span className="truncate text-muted-foreground text-xs">
									{u.name}
								</span>
							) : null}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
});
