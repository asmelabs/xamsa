import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactionType } from "@xamsa/schemas/db/schemas/enums/ReactionType.schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { Button } from "@xamsa/ui/components/button";
import {
	Dialog,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { Spinner } from "@xamsa/ui/components/spinner";
import { cn } from "@xamsa/ui/lib/utils";
import { ChevronLeftIcon, SmilePlusIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { orpc } from "@/utils/orpc";

const ALL_REACTIONS: ReactionType[] = [
	"heart",
	"laugh",
	"wow",
	"sad",
	"angry",
	"dislike",
];

export function reactionEmoji(type: ReactionType): string {
	switch (type) {
		case "heart":
			return "❤️";
		case "dislike":
			return "👎";
		case "laugh":
			return "😂";
		case "sad":
			return "😢";
		case "angry":
			return "😠";
		case "wow":
			return "😮";
	}
}

export function reactionLabel(type: ReactionType): string {
	switch (type) {
		case "heart":
			return "Heart";
		case "dislike":
			return "Dislike";
		case "laugh":
			return "Laugh";
		case "sad":
			return "Sad";
		case "angry":
			return "Angry";
		case "wow":
			return "Wow";
	}
}

export type ReactionBreakdownEntry = {
	type: ReactionType;
	count: number;
};

type LocalRx = {
	my: ReactionType | undefined;
	total: number;
	by: ReactionBreakdownEntry[];
};

function mapFromBy(
	arr: readonly ReactionBreakdownEntry[],
): Map<ReactionType, number> {
	return new Map(arr.map((e) => [e.type, e.count]));
}

function sortMapToBy(m: Map<ReactionType, number>): LocalRx["by"] {
	return [...m.entries()]
		.filter(([, c]) => c > 0)
		.sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
		.map(([type, count]) => ({ type, count }));
}

/**
 * Pure local-state transition that mirrors `setReaction` semantics:
 *  - clearing while no row exists is a no-op
 *  - first-time → +1 to total, set `my`
 *  - same emoji while my=type → toggle off, −1 total
 *  - swap to a different emoji → keeps total, just shifts breakdown buckets
 */
function applyReactionChange(
	prev: LocalRx,
	nextType: ReactionType | null,
): LocalRx {
	const m = mapFromBy(prev.by);
	const prevMy = prev.my;
	let total = prev.total;

	const bump = (t: ReactionType, d: number) => {
		const n = Math.max(0, (m.get(t) ?? 0) + d);
		if (n === 0) m.delete(t);
		else m.set(t, n);
	};

	if (nextType === null) {
		if (prevMy !== undefined) {
			bump(prevMy, -1);
			total = Math.max(0, total - 1);
		}
		return {
			my: undefined,
			total,
			by: sortMapToBy(m),
		};
	}

	if (prevMy === undefined) {
		bump(nextType, 1);
		return {
			my: nextType,
			total: total + 1,
			by: sortMapToBy(m),
		};
	}

	if (prevMy === nextType) {
		bump(nextType, -1);
		return {
			my: undefined,
			total: Math.max(0, total - 1),
			by: sortMapToBy(m),
		};
	}

	bump(prevMy, -1);
	bump(nextType, 1);
	return {
		my: nextType,
		total,
		by: sortMapToBy(m),
	};
}

function countsMapFromLocal(local: LocalRx): Map<ReactionType, number> {
	const base = new Map<ReactionType, number>();
	for (const t of ALL_REACTIONS) {
		base.set(t, 0);
	}
	for (const row of local.by) {
		base.set(row.type, row.count);
	}
	return base;
}

function ReactorList({
	target,
	type,
}: {
	target: ReactionTarget;
	type: ReactionType | "all";
}) {
	const targetInput =
		target.kind === "post" ? { postId: target.id } : { commentId: target.id };
	const typeInput = type === "all" ? {} : { type };

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery({
			...orpc.reaction.listReactors.infiniteOptions({
				input: (pageParam: string | undefined) => ({
					...targetInput,
					...typeInput,
					limit: 20,
					cursor: pageParam,
				}),
				initialPageParam: undefined as string | undefined,
				getNextPageParam: (lastPage) =>
					lastPage.metadata.nextCursor ?? undefined,
			}),
		});

	const items = data?.pages.flatMap((p) => p.items) ?? [];

	if (isLoading) {
		return (
			<div className="flex justify-center py-8">
				<Spinner />
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<p className="px-5 py-8 text-center text-muted-foreground text-sm">
				No one has reacted with this yet.
			</p>
		);
	}

	return (
		<div>
			<ul className="divide-y divide-border/60">
				{items.map((row) => {
					const display = row.user.name || row.user.username;
					return (
						<li key={row.id}>
							<Link
								to="/u/$username"
								params={{ username: row.user.username }}
								className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/40"
							>
								<Avatar className="size-8 shrink-0">
									<AvatarImage src={row.user.image ?? undefined} />
									<AvatarFallback>
										{display.slice(0, 1).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm leading-tight">
										{display}
									</p>
									<p className="truncate text-muted-foreground text-xs">
										@{row.user.username}
									</p>
								</div>
								<span
									className="text-lg leading-none"
									aria-label={reactionLabel(row.type)}
								>
									{reactionEmoji(row.type)}
								</span>
							</Link>
						</li>
					);
				})}
			</ul>
			{hasNextPage ? (
				<div className="flex justify-center py-3">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							void fetchNextPage();
						}}
						disabled={isFetchingNextPage}
					>
						{isFetchingNextPage ? "Loading…" : "Load more"}
					</Button>
				</div>
			) : null}
		</div>
	);
}

type DialogView =
	| { kind: "summary" }
	| { kind: "reactors"; type: ReactionType | "all" };

function ReactionBreakdownDialog({
	open,
	onOpenChange,
	local,
	subjectLabel,
	target,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	local: LocalRx;
	subjectLabel: string;
	target: ReactionTarget;
}) {
	const [view, setView] = useState<DialogView>({ kind: "summary" });
	const counts = countsMapFromLocal(local);
	const used = ALL_REACTIONS.filter((t) => (counts.get(t) ?? 0) > 0).sort(
		(a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0),
	);

	useEffect(() => {
		if (!open) setView({ kind: "summary" });
	}, [open]);

	const headerCopy =
		view.kind === "summary"
			? local.total === 1
				? "1 reaction"
				: `${local.total} reactions`
			: view.type === "all"
				? `${local.total} reactor${local.total === 1 ? "" : "s"}`
				: `${counts.get(view.type) ?? 0} ${reactionLabel(view.type).toLowerCase()} reactor${(counts.get(view.type) ?? 0) === 1 ? "" : "s"}`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className="max-w-sm p-0" showCloseButton>
				<DialogHeader className="border-border border-b px-5 py-4 text-left">
					<div className="flex items-center gap-2">
						{view.kind === "reactors" ? (
							<button
								type="button"
								onClick={() => setView({ kind: "summary" })}
								className="-ml-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
								aria-label="Back to reaction breakdown"
							>
								<ChevronLeftIcon className="size-4" />
							</button>
						) : null}
						<DialogTitle className="font-semibold text-base">
							{view.kind === "summary"
								? "Reactions"
								: view.type === "all"
									? "Everyone who reacted"
									: `${reactionLabel(view.type)} reactions`}
						</DialogTitle>
					</div>
					<p className="font-normal text-muted-foreground text-xs">
						<span className="font-semibold text-foreground tabular-nums">
							{headerCopy}
						</span>
						{view.kind === "summary"
							? ` on this ${subjectLabel}`
							: " · tap any name to visit their profile"}
					</p>
				</DialogHeader>
				<DialogPanel className="max-h-[min(80vh,28rem)] overflow-y-auto px-0 py-0">
					{view.kind === "summary" ? (
						used.length === 0 ? (
							<p className="px-5 py-8 text-center text-muted-foreground text-sm">
								No reactions yet.
							</p>
						) : (
							<>
								<button
									type="button"
									onClick={() => setView({ kind: "reactors", type: "all" })}
									className="w-full border-border/60 border-b bg-muted/30 px-5 py-2.5 text-left text-muted-foreground text-xs uppercase tracking-wider transition-colors hover:bg-muted/60 hover:text-foreground"
								>
									See everyone ({local.total})
								</button>
								<ul className="divide-y divide-border/60">
									{used.map((type) => {
										const n = counts.get(type) ?? 0;
										const pct = local.total > 0 ? (n / local.total) * 100 : 0;
										const isMine = local.my === type;
										return (
											<li
												key={type}
												className={cn("relative", isMine && "bg-primary/4")}
											>
												<span
													aria-hidden
													className="absolute inset-y-0 left-0 bg-primary/[0.07]"
													style={{ width: `${Math.max(2, pct)}%` }}
												/>
												<button
													type="button"
													onClick={() => setView({ kind: "reactors", type })}
													className="relative z-10 flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
												>
													<span className="text-2xl leading-none" aria-hidden>
														{reactionEmoji(type)}
													</span>
													<div className="min-w-0 flex-1">
														<p className="font-semibold text-foreground text-sm leading-tight">
															{reactionLabel(type)}
															{isMine ? (
																<span className="ml-2 inline-flex items-center rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary uppercase tracking-wider">
																	You
																</span>
															) : null}
														</p>
														<p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
															{pct.toFixed(0)}% of all reactions · tap to see
															reactors
														</p>
													</div>
													<span className="font-semibold text-base text-foreground tabular-nums">
														{n}
													</span>
												</button>
											</li>
										);
									})}
								</ul>
							</>
						)
					) : (
						<ReactorList target={target} type={view.type} />
					)}
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}

export type ReactionTarget =
	| { kind: "post"; id: string }
	| { kind: "comment"; id: string };

export type ReactionBarProps = {
	target: ReactionTarget;
	my: ReactionType | undefined;
	total: number;
	byType: readonly ReactionBreakdownEntry[];
	sessionUserId: string | undefined;
	/** Called after a mutation settles (success or error). Used for cache invalidation. */
	onSettled?: (() => void) | (() => Promise<unknown>);
	/** Visual density. `comment` is denser (smaller chips, no leading "React" copy). */
	density?: "post" | "comment";
	/** Where to send users that aren't logged in when they click "log in to react". */
	loginRedirect?: string;
	/** Override the subject noun in the breakdown dialog. Defaults to target.kind. */
	subjectLabel?: string;
	/** Optional inline label after the chips (e.g. spacing slot). */
	trailing?: ReactNode;
};

export function ReactionBar({
	target,
	my,
	total,
	byType,
	sessionUserId,
	onSettled,
	density = "post",
	loginRedirect = "/",
	subjectLabel,
	trailing,
}: ReactionBarProps) {
	const qc = useQueryClient();
	const addAnchorRef = useRef<HTMLButtonElement>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [breakdownOpen, setBreakdownOpen] = useState(false);
	const [pickerPos, setPickerPos] = useState({ left: 0, top: 0 });

	const [local, setLocal] = useState<LocalRx>(() => ({
		my,
		total,
		by: [...byType],
	}));
	const localRef = useRef(local);

	useEffect(() => {
		const next: LocalRx = { my, total, by: [...byType] };
		setLocal(next);
		localRef.current = next;
	}, [my, total, byType]);

	useEffect(() => {
		localRef.current = local;
	}, [local]);

	const setRx = useMutation(
		orpc.reaction.set.mutationOptions({
			onMutate: (vars) => {
				const prev = localRef.current;
				const snapshot: LocalRx = {
					my: prev.my,
					total: prev.total,
					by: [...prev.by],
				};
				const next = applyReactionChange(prev, vars.type);
				localRef.current = next;
				setLocal(next);
				return { snapshot };
			},
			onError: (_err, _vars, ctx) => {
				const snap =
					ctx && typeof ctx === "object" && "snapshot" in ctx
						? (ctx as { snapshot?: LocalRx }).snapshot
						: undefined;
				if (snap != null) setLocal(snap);
			},
			onSettled: async () => {
				if (onSettled) {
					await onSettled();
				} else {
					await qc.invalidateQueries({
						predicate: () => true,
						refetchType: "none",
					});
				}
			},
		}),
	);

	const targetInput =
		target.kind === "post" ? { postId: target.id } : { commentId: target.id };

	const commitType = (t: ReactionType | null) => {
		setRx.mutate({ ...targetInput, type: t });
		setPickerOpen(false);
	};

	const onChipClick = (t: ReactionType) => {
		if (!sessionUserId) return;
		commitType(local.my === t ? null : t);
	};

	const openPicker = () => {
		const el = addAnchorRef.current;
		if (el) {
			const r = el.getBoundingClientRect();
			setPickerPos({
				left: r.left + r.width / 2,
				top: r.top - 6,
			});
		}
		setPickerOpen(true);
	};

	const isCompact = density === "comment";
	const chipHeight = isCompact ? "h-7" : "h-8";
	const chipMinW = isCompact ? "min-w-8" : "min-w-9";
	const chipPad = isCompact ? "px-1.5" : "px-2";
	const chipEmoji = isCompact ? "text-sm" : "text-base";

	const breakdownLink =
		local.total > 0 ? (
			<button
				type="button"
				onClick={() => setBreakdownOpen(true)}
				className="text-muted-foreground text-xs leading-none transition-colors hover:text-foreground hover:underline"
			>
				<span className="font-medium text-foreground tabular-nums">
					{local.total}
				</span>
				{local.total === 1 ? " reaction" : " reactions"}
			</button>
		) : null;

	const renderChip = (type: ReactionType, count: number) => {
		const isMine = local.my === type;
		const interactive = Boolean(sessionUserId);
		return (
			<button
				key={type}
				type="button"
				disabled={!interactive || setRx.isPending}
				aria-pressed={isMine}
				aria-label={`${reactionLabel(type)} (${count})${isMine ? " — your reaction, click to remove" : ""}`}
				onClick={() => onChipClick(type)}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-md border text-xs leading-none transition-colors",
					chipHeight,
					chipMinW,
					chipPad,
					isMine
						? "border-primary/55 bg-primary/10 text-foreground"
						: "border-border bg-card text-foreground",
					interactive
						? "hover:border-primary/35 hover:bg-muted/60"
						: "cursor-default opacity-90",
					setRx.isPending && interactive && "opacity-70",
				)}
			>
				<span className={cn("leading-none", chipEmoji)} aria-hidden>
					{reactionEmoji(type)}
				</span>
				<span className="font-medium tabular-nums">{count}</span>
			</button>
		);
	};

	return (
		<div className="flex select-none flex-wrap items-center gap-1.5">
			{local.by.map((row) => renderChip(row.type, row.count))}

			{sessionUserId ? (
				<button
					ref={addAnchorRef}
					type="button"
					onClick={openPicker}
					disabled={setRx.isPending}
					aria-haspopup="listbox"
					aria-expanded={pickerOpen}
					aria-label="Add a reaction"
					className={cn(
						"inline-flex items-center justify-center gap-1 rounded-md border border-border border-dashed text-muted-foreground text-xs transition-colors",
						chipHeight,
						chipMinW,
						chipPad,
						"hover:border-primary/40 hover:bg-muted/60 hover:text-foreground",
						setRx.isPending && "opacity-70",
					)}
				>
					<SmilePlusIcon
						className={cn(isCompact ? "size-3.5" : "size-4")}
						strokeWidth={1.75}
					/>
					{!isCompact && local.by.length === 0 ? (
						<span className="font-medium">React</span>
					) : null}
				</button>
			) : null}

			{breakdownLink ? <span className="ml-1">{breakdownLink}</span> : null}

			{!sessionUserId && local.by.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					<Link
						className="underline underline-offset-2"
						to="/auth/login"
						search={{ redirect_url: loginRedirect }}
					>
						Log in
					</Link>{" "}
					to react
				</p>
			) : null}

			{trailing}

			<ReactionBreakdownDialog
				open={breakdownOpen}
				onOpenChange={setBreakdownOpen}
				local={local}
				subjectLabel={subjectLabel ?? target.kind}
				target={target}
			/>

			{pickerOpen ? (
				<>
					<button
						type="button"
						tabIndex={-1}
						className="fade-in fixed inset-0 z-40 animate-in duration-150"
						style={{ animationDuration: "120ms" }}
						aria-label="Dismiss reaction picker"
						onClick={(e) => {
							e.preventDefault();
							setPickerOpen(false);
						}}
					/>
					{/** biome-ignore lint/a11y/useKeyWithClickEvents: keyboard nav happens on the inner buttons */}
					<div
						role="listbox"
						aria-label="Choose reaction"
						className="fade-in zoom-in-95 fixed z-50 flex animate-in items-center gap-0.5 rounded-md border bg-popover p-1 shadow-lg duration-150"
						style={{
							animationDuration: "120ms",
							left: pickerPos.left,
							top: pickerPos.top,
							transform: "translate(-50%, -100%)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						{ALL_REACTIONS.map((r) => (
							<button
								key={r}
								type="button"
								className={cn(
									"flex size-9 shrink-0 items-center justify-center rounded-md text-lg leading-none hover:bg-accent",
									local.my === r && "bg-accent",
								)}
								onClick={() => commitType(r)}
								aria-label={reactionLabel(r)}
							>
								<span aria-hidden>{reactionEmoji(r)}</span>
								<span className="sr-only">{reactionLabel(r)}</span>
							</button>
						))}
					</div>
				</>
			) : null}
		</div>
	);
}
