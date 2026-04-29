"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { HomeSearchItemType } from "@xamsa/schemas/modules/search";
import {
	CommandDialog,
	CommandDialogPopup,
	CommandPanel,
} from "@xamsa/ui/components/command";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@xamsa/ui/components/input-group";
import { ScrollArea } from "@xamsa/ui/components/scroll-area";
import { Spinner } from "@xamsa/ui/components/spinner";
import { cn } from "@xamsa/ui/lib/utils";
import {
	Gamepad2Icon,
	ListTreeIcon,
	PackageIcon,
	SearchIcon,
	UserIcon,
} from "lucide-react";
import {
	createContext,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { orpc } from "@/utils/orpc";

const SEARCH_WAIT_MS = 250;
const MIN_CHARS = 1;

type GlobalSearchContextValue = {
	open: boolean;
	setOpen: (open: boolean) => void;
	openSearch: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(
	null,
);

export function useGlobalSearch(): GlobalSearchContextValue {
	const ctx = useContext(GlobalSearchContext);
	if (!ctx) {
		throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
	}
	return ctx;
}

function itemIconAndLabel(kind: HomeSearchItemType["kind"]): {
	icon: typeof UserIcon;
	label: string;
} {
	switch (kind) {
		case "user":
			return { icon: UserIcon, label: "User" };
		case "pack":
			return { icon: PackageIcon, label: "Pack" };
		case "topic":
			return { icon: ListTreeIcon, label: "Topic" };
		case "game":
			return { icon: Gamepad2Icon, label: "Game" };
	}
}

function HomeSearchRow({
	item,
	onPick,
	isActive,
}: {
	item: HomeSearchItemType;
	onPick: () => void;
	isActive: boolean;
}) {
	const { icon: Icon, label } = itemIconAndLabel(item.kind);
	const desc =
		item.description && item.description.trim().length > 0
			? item.description
			: null;

	const inner = (
		<>
			<div className="flex size-9 shrink-0 items-center justify-center bg-muted/80 text-muted-foreground">
				<Icon className="size-4" strokeWidth={1.75} />
			</div>
			<div className="min-w-0 flex-1 text-start">
				<div className="flex flex-wrap items-center gap-2">
					<span className="truncate font-medium text-sm">{item.title}</span>
					<span className="shrink-0 bg-primary/10 px-1.5 py-px font-medium text-[10px] text-primary uppercase tracking-wide">
						{label}
					</span>
				</div>
				{desc ? (
					<p className="mt-0.5 truncate text-muted-foreground text-xs">
						{desc}
					</p>
				) : null}
			</div>
		</>
	);

	const rowClass = cn(
		"flex w-full items-center gap-3 px-2 py-2 text-start outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
		isActive && "bg-accent text-accent-foreground",
	);

	if (item.kind === "user") {
		return (
			<Link
				to="/u/$username"
				params={{ username: item.username }}
				className={rowClass}
				aria-selected={isActive}
				onClick={onPick}
			>
				{inner}
			</Link>
		);
	}
	if (item.kind === "pack") {
		return (
			<Link
				to="/packs/$packSlug"
				params={{ packSlug: item.slug }}
				className={rowClass}
				aria-selected={isActive}
				onClick={onPick}
			>
				{inner}
			</Link>
		);
	}
	if (item.kind === "topic") {
		return (
			<Link
				to="/packs/$packSlug/topics/$topicSlug"
				params={{ packSlug: item.packSlug, topicSlug: item.topicSlug }}
				className={rowClass}
				aria-selected={isActive}
				onClick={onPick}
			>
				{inner}
			</Link>
		);
	}
	return (
		<Link
			to="/g/$code"
			params={{ code: item.code }}
			className={rowClass}
			aria-selected={isActive}
			onClick={onPick}
		>
			{inner}
		</Link>
	);
}

function openItemRoute(
	navigate: ReturnType<typeof useNavigate>,
	item: HomeSearchItemType,
) {
	switch (item.kind) {
		case "user":
			void navigate({
				to: "/u/$username",
				params: { username: item.username },
			});
			break;
		case "pack":
			void navigate({
				to: "/packs/$packSlug",
				params: { packSlug: item.slug },
			});
			break;
		case "topic":
			void navigate({
				to: "/packs/$packSlug/topics/$topicSlug",
				params: { packSlug: item.packSlug, topicSlug: item.topicSlug },
			});
			break;
		case "game":
			void navigate({ to: "/g/$code", params: { code: item.code } });
			break;
	}
}

function GlobalSearchDialog() {
	const { open, setOpen } = useGlobalSearch();
	const navigate = useNavigate();
	const [rawQuery, setRawQuery] = useState("");
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const listRef = useRef<HTMLUListElement>(null);
	const [debouncedQuery] = useDebouncedValue(rawQuery, {
		wait: SEARCH_WAIT_MS,
	});
	const inputId = useId();

	const q = debouncedQuery.trim();
	const enabled = open && q.length >= MIN_CHARS;

	const { data, isFetching, isError } = useQuery(
		orpc.user.homeSearch.queryOptions({
			input: { query: q, limit: 8 },
			enabled,
		}),
	);

	useEffect(() => {
		if (!open) {
			setRawQuery("");
			setHighlightedIndex(0);
		}
	}, [open]);

	useEffect(() => {
		setHighlightedIndex(0);
	}, [q]);

	const items = data?.items ?? [];

	useEffect(() => {
		setHighlightedIndex((i) => {
			if (items.length === 0) return 0;
			return Math.min(i, items.length - 1);
		});
	}, [items.length]);

	useEffect(() => {
		if (items.length === 0 || !listRef.current) return;
		const row = listRef.current.querySelector(
			`[data-search-index="${highlightedIndex}"]`,
		);
		row?.scrollIntoView({ block: "nearest" });
	}, [highlightedIndex, items.length]);

	const pickHighlighted = useCallback(() => {
		const item = items[highlightedIndex];
		if (!item) return;
		openItemRoute(navigate, item);
		setOpen(false);
	}, [items, highlightedIndex, navigate, setOpen]);

	const onResultsKeyDownCapture = useCallback(
		(e: ReactKeyboardEvent) => {
			if (!enabled || items.length === 0) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setHighlightedIndex((i) => Math.min(i + 1, items.length - 1));
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setHighlightedIndex((i) => Math.max(i - 1, 0));
				return;
			}
			if (e.key === "Enter") {
				e.preventDefault();
				pickHighlighted();
			}
		},
		[enabled, items.length, pickHighlighted],
	);

	return (
		<CommandDialog open={open} onOpenChange={setOpen}>
			<CommandDialogPopup className="max-w-xl">
				<CommandPanel
					className="relative border-0 shadow-none [clip-path:none]"
					onKeyDownCapture={onResultsKeyDownCapture}
				>
					<div className="flex items-center gap-2 border-b px-3 py-2">
						<InputGroup>
							<InputGroupInput
								id={inputId}
								autoFocus
								autoComplete="off"
								placeholder="Search…"
								value={rawQuery}
								onChange={(e) => setRawQuery(e.target.value)}
								className="h-10 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
							/>
							<InputGroupAddon>
								<SearchIcon
									className="size-4.5 shrink-0 text-muted-foreground"
									strokeWidth={1.75}
								/>
							</InputGroupAddon>
							{isFetching ? (
								<InputGroupAddon align="inline-end">
									<Spinner className="size-4 shrink-0 text-muted-foreground" />
								</InputGroupAddon>
							) : null}
						</InputGroup>
					</div>
					<ScrollArea
						className={cn(
							"max-h-[min(60vh,22rem)]",
							items.length === 0 && !enabled && "min-h-18",
						)}
					>
						<div className="p-2">
							{!enabled ? (
								<p className="px-2 py-6 text-center text-muted-foreground text-sm">
									Type at least one character to search.
								</p>
							) : isError ? (
								<p className="px-2 py-6 text-center text-destructive text-sm">
									Something went wrong. Try again.
								</p>
							) : isFetching && items.length === 0 ? (
								<p className="px-2 py-6 text-center text-muted-foreground text-sm">
									Searching…
								</p>
							) : items.length === 0 ? (
								<p className="px-2 py-6 text-center text-muted-foreground text-sm">
									No results.
								</p>
							) : (
								<ul ref={listRef} className="space-y-0.5">
									{items.map((item, i) => (
										<li
											key={
												item.kind === "user"
													? `u-${item.username}`
													: item.kind === "pack"
														? `p-${item.slug}`
														: item.kind === "topic"
															? `t-${item.packSlug}-${item.topicSlug}`
															: `g-${item.code}-${i}`
											}
											data-search-index={i}
											role="presentation"
										>
											<HomeSearchRow
												item={item}
												isActive={i === highlightedIndex}
												onPick={() => setOpen(false)}
											/>
										</li>
									))}
								</ul>
							)}
						</div>
					</ScrollArea>
				</CommandPanel>
			</CommandDialogPopup>
		</CommandDialog>
	);
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const openSearch = useCallback(() => setOpen(true), []);

	const value = useMemo(
		() => ({ open, setOpen, openSearch }),
		[open, openSearch],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() !== "k") return;
			if (!e.metaKey && !e.ctrlKey) return;
			e.preventDefault();
			setOpen((prev) => !prev);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<GlobalSearchContext.Provider value={value}>
			{children}
			<GlobalSearchDialog />
		</GlobalSearchContext.Provider>
	);
}
