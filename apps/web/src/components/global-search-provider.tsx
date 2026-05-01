"use client";

import { useDebouncedValue } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { HomeSearchItemType } from "@xamsa/schemas/modules/search";
import { HOME_SEARCH_MAX } from "@xamsa/schemas/modules/search";
import {
	CommandDialog,
	CommandDialogPopup,
	CommandPanel,
} from "@xamsa/ui/components/command";
import {
	Dialog,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@xamsa/ui/components/input-group";
import { ScrollArea } from "@xamsa/ui/components/scroll-area";
import { Spinner } from "@xamsa/ui/components/spinner";
import { cn } from "@xamsa/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
	Gamepad2Icon,
	LayoutDashboardIcon,
	ListTreeIcon,
	LogOutIcon,
	PackageIcon,
	SearchIcon,
	UserIcon,
} from "lucide-react";
import posthog from "posthog-js";
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
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { analyzeHomeSearchQuery, pageItem } from "@/lib/home-search-commands";
import { isStaffRole } from "@/lib/staff";
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
	icon: LucideIcon;
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
		case "page":
			return { icon: LayoutDashboardIcon, label: "Page" };
		case "action":
			return { icon: LogOutIcon, label: "Action" };
	}
}

function HomeSearchRow({
	item,
	onPick,
	isActive,
}: {
	item: HomeSearchItemType;
	onPick: (picked: HomeSearchItemType) => void;
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

	if (item.kind === "action") {
		return (
			<button
				type="button"
				className={rowClass}
				aria-selected={isActive}
				onClick={() => onPick(item)}
			>
				{inner}
			</button>
		);
	}

	if (item.kind === "user") {
		return (
			<Link
				to="/u/$username"
				params={{ username: item.username }}
				className={rowClass}
				aria-selected={isActive}
				onClick={(e) => {
					e.preventDefault();
					onPick(item);
				}}
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
				onClick={(e) => {
					e.preventDefault();
					onPick(item);
				}}
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
				onClick={(e) => {
					e.preventDefault();
					onPick(item);
				}}
			>
				{inner}
			</Link>
		);
	}
	if (item.kind === "page") {
		return (
			<Link
				to={item.to}
				{...(item.search ? { search: item.search } : {})}
				className={rowClass}
				aria-selected={isActive}
				onClick={(e) => {
					e.preventDefault();
					onPick(item);
				}}
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
			onClick={(e) => {
				e.preventDefault();
				onPick(item);
			}}
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
		case "page":
			void navigate({
				to: item.to,
				...(item.search ? { search: item.search } : {}),
			});
			break;
		case "action":
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

	const { data: sessionData } = authClient.useSession();
	const user = sessionData?.user;

	const { data: activeGame } = useQuery({
		...orpc.user.getActiveGame.queryOptions({ input: {} }),
		enabled: open && !!user,
	});

	const commandCtx = useMemo(
		() => ({
			isSignedIn: !!user,
			isStaff: isStaffRole(user?.role),
			viewerUsername: user?.username ?? null,
			hasActiveGame: !!activeGame,
			activeGameCode: activeGame?.code ?? null,
		}),
		[user, activeGame],
	);

	const rawTrimmed = rawQuery.trim();
	const debouncedTrimmed = debouncedQuery.trim();
	const hasQuery = open && rawTrimmed.length >= MIN_CHARS;

	const analysis = useMemo(
		() => analyzeHomeSearchQuery(rawTrimmed, commandCtx),
		[rawTrimmed, commandCtx],
	);

	const { data: draftPacks, isFetching: draftsFetching } = useQuery({
		...orpc.pack.list.queryOptions({
			input: {
				limit: HOME_SEARCH_MAX,
				onlyMyPacks: true,
				statuses: ["draft"],
				sort: "newest",
				dir: "desc",
			},
		}),
		enabled: open && analysis.fetchDraftPacks,
	});

	const { data: hostPacks, isFetching: hostsFetching } = useQuery({
		...orpc.pack.list.queryOptions({
			input: {
				limit: HOME_SEARCH_MAX,
				canHost: true,
				statuses: ["published"],
				sort: "newest",
				dir: "desc",
			},
		}),
		enabled: open && analysis.fetchHostPacks && !!user,
	});

	const { data: lobbies, isFetching: lobbiesFetching } = useQuery({
		...orpc.game.listJoinableWaitingLobbies.queryOptions({
			input: { limit: 15 },
		}),
		enabled: open && analysis.fetchJoinLobbies && !!user,
	});

	const commandDataPending =
		(analysis.fetchDraftPacks && draftsFetching) ||
		(analysis.fetchHostPacks && hostsFetching) ||
		(analysis.fetchJoinLobbies && lobbiesFetching);

	const mergedWithoutApi = useMemo(() => {
		const max = HOME_SEARCH_MAX;
		const out: HomeSearchItemType[] = [...analysis.staticItems];

		const pushCap = (rows: HomeSearchItemType[]) => {
			for (const row of rows) {
				if (out.length >= max) break;
				out.push(row);
			}
		};

		if (analysis.fetchDraftPacks && !draftsFetching) {
			const rows = draftPacks?.items ?? [];
			if (rows.length === 0) {
				pushCap([
					pageItem(
						"Create a draft pack first",
						"No draft packs yet",
						"/packs/new/",
					),
				]);
			} else {
				pushCap(
					rows.map((p) =>
						pageItem(
							`New topic · ${p.name}`,
							`Draft pack · ${p.slug}`,
							`/packs/${p.slug}/topics/new/`,
						),
					),
				);
			}
		}

		if (analysis.fetchHostPacks && !hostsFetching) {
			const rows = hostPacks?.items ?? [];
			pushCap(
				rows.map((p) =>
					pageItem(
						`Host · ${p.name}`,
						"Start a game from this pack",
						`/play/new/${p.slug}/`,
					),
				),
			);
		}

		if (analysis.fetchJoinLobbies && !lobbiesFetching) {
			const rows = lobbies?.items ?? [];
			pushCap(
				rows.map((g) =>
					pageItem(
						`Join · ${g.code}`,
						`${g.packName} · ${g.hostName}`,
						`/join/${g.code}/`,
					),
				),
			);
		}

		return out.slice(0, max);
	}, [
		analysis,
		draftPacks,
		hostPacks,
		lobbies,
		draftsFetching,
		hostsFetching,
		lobbiesFetching,
	]);

	const apiLimit = HOME_SEARCH_MAX - mergedWithoutApi.length;

	const apiEnabled =
		hasQuery &&
		!commandDataPending &&
		apiLimit > 0 &&
		debouncedTrimmed.length >= MIN_CHARS;

	const {
		data: apiData,
		isFetching: apiFetching,
		isError,
	} = useQuery(
		orpc.user.homeSearch.queryOptions({
			input: { query: debouncedTrimmed, limit: apiLimit },
			enabled: apiEnabled,
		}),
	);

	const items = useMemo(() => {
		const slice = (apiData?.items ?? []).slice(0, apiLimit);
		return [...mergedWithoutApi, ...slice];
	}, [mergedWithoutApi, apiData, apiLimit]);

	const anyFetching =
		apiFetching ||
		(analysis.fetchDraftPacks && draftsFetching) ||
		(analysis.fetchHostPacks && hostsFetching) ||
		(analysis.fetchJoinLobbies && lobbiesFetching);

	useEffect(() => {
		if (!open) {
			setRawQuery("");
			setHighlightedIndex(0);
		}
	}, [open]);

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

	const handlePick = useCallback(
		async (item: HomeSearchItemType) => {
			setOpen(false);
			if (item.kind === "action" && item.action === "logout") {
				try {
					await authClient.signOut();
					posthog.reset();
					toast.success("Signed out");
					void navigate({ to: "/" });
				} catch {
					toast.error("Failed to sign out. Try again.");
				}
				return;
			}
			openItemRoute(navigate, item);
		},
		[navigate, setOpen],
	);

	const pickHighlighted = useCallback(() => {
		const item = items[highlightedIndex];
		if (!item) return;
		void handlePick(item);
	}, [items, highlightedIndex, handlePick]);

	const listInteractive = hasQuery && items.length > 0;

	const onResultsKeyDownCapture = useCallback(
		(e: ReactKeyboardEvent) => {
			if (!listInteractive) return;
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
		[listInteractive, items.length, pickHighlighted],
	);

	const showLoading =
		hasQuery &&
		items.length === 0 &&
		(anyFetching || (apiEnabled && apiFetching));

	const showError =
		hasQuery && items.length === 0 && isError && !anyFetching && apiEnabled;

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
								onChange={(e) => {
									setRawQuery(e.target.value);
									setHighlightedIndex(0);
								}}
								className="h-10 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
							/>
							<InputGroupAddon>
								<SearchIcon
									className="size-4.5 shrink-0 text-muted-foreground"
									strokeWidth={1.75}
								/>
							</InputGroupAddon>
							{anyFetching ? (
								<InputGroupAddon align="inline-end">
									<Spinner className="size-4 shrink-0 text-muted-foreground" />
								</InputGroupAddon>
							) : null}
						</InputGroup>
					</div>
					<ScrollArea
						className={cn(
							"max-h-[min(60vh,22rem)]",
							items.length === 0 && !hasQuery && "min-h-18",
						)}
					>
						<div className="p-2">
							{!hasQuery ? (
								<p className="px-2 py-6 text-center text-muted-foreground text-sm">
									Type at least one character to search.
								</p>
							) : showError ? (
								<p className="px-2 py-6 text-center text-destructive text-sm">
									Something went wrong. Try again.
								</p>
							) : showLoading ? (
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
															: item.kind === "game"
																? `g-${item.code}-${i}`
																: item.kind === "page"
																	? `page-${item.to}-${JSON.stringify(item.search ?? {})}-${i}`
																	: `action-${item.action}-${i}`
											}
											data-search-index={i}
											role="presentation"
										>
											<HomeSearchRow
												item={item}
												isActive={i === highlightedIndex}
												onPick={handlePick}
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

function SearchHelpDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (next: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className="max-w-lg">
				<DialogHeader>
					<DialogTitle>About search</DialogTitle>
				</DialogHeader>
				<DialogPanel
					scrollFade={false}
					className="space-y-4 pb-6 text-muted-foreground text-sm"
				>
					<section className="space-y-2">
						<p className="font-medium text-foreground">Keyboard</p>
						<ul className="list-inside list-disc space-y-1">
							<li>Open or close search — ⌘K (Mac) or Ctrl+K (Windows/Linux)</li>
							<li>Show this dialog — ⌘I or Ctrl+I</li>
							<li>Move highlight — ↑ and ↓ arrows</li>
							<li>Go to selection — Enter</li>
						</ul>
					</section>
					<section className="space-y-2">
						<p className="font-medium text-foreground">Typed shortcuts</p>
						<ul className="list-inside list-disc space-y-1">
							<li>
								Pages like leaderboard, play, badges, history, whats-new,
								settings, privacy, terms
							</li>
							<li>
								Prefix syntax: leaderboard:elo, whats-new:latest,
								whats-new:26.05.00, settings:security, badges:id
							</li>
							<li>
								Games: join:CODE — or type any query to match users, packs,
								topics, and codes
							</li>
							<li>
								Signed in: profile, logout, create:pack, create:topic,
								join:game, …
							</li>
						</ul>
					</section>
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
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

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() !== "i") return;
			if (!e.metaKey && !e.ctrlKey) return;
			e.preventDefault();
			setHelpOpen(true);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<GlobalSearchContext.Provider value={value}>
			{children}
			<GlobalSearchDialog />
			<SearchHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
		</GlobalSearchContext.Provider>
	);
}
