import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactionType } from "@xamsa/schemas/db/schemas/enums/ReactionType.schema";
import type { PostRowType } from "@xamsa/schemas/modules/post";
import {
	Dialog,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { cn } from "@xamsa/ui/lib/utils";
import { SmilePlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { invalidateHomePostFeed } from "@/lib/home-post-feed-query";
import { orpc } from "@/utils/orpc";

const ALL_REACTIONS: ReactionType[] = [
	"heart",
	"laugh",
	"wow",
	"sad",
	"angry",
	"dislike",
];

function reactionEmoji(type: ReactionType): string {
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

function reactionLabel(type: ReactionType): string {
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

type LocalRx = {
	my: ReactionType | undefined;
	total: number;
	by: { type: ReactionType; count: number }[];
};

function mapFromBy(
	arr: PostRowType["reactionsByType"],
): Map<ReactionType, number> {
	return new Map(arr.map((e) => [e.type, e.count]));
}

function sortMapToBy(m: Map<ReactionType, number>): LocalRx["by"] {
	return [...m.entries()]
		.filter(([, c]) => c > 0)
		.sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
		.map(([type, count]) => ({ type, count }));
}

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

function ReactionBreakdownDialog({
	open,
	onOpenChange,
	local,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	local: LocalRx;
}) {
	const counts = countsMapFromLocal(local);
	const used = ALL_REACTIONS.filter((t) => (counts.get(t) ?? 0) > 0).sort(
		(a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0),
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className="max-w-sm p-0" showCloseButton>
				<DialogHeader className="border-border border-b px-5 py-4 text-left">
					<DialogTitle className="font-semibold text-base">
						Reactions
					</DialogTitle>
					<p className="font-normal text-muted-foreground text-xs">
						<span className="font-semibold text-foreground tabular-nums">
							{local.total}
						</span>
						{local.total === 1 ? " reaction" : " reactions"} from the lobby
					</p>
				</DialogHeader>
				<DialogPanel className="max-h-[min(80vh,28rem)] px-0 py-2">
					{used.length === 0 ? (
						<p className="px-5 py-8 text-center text-muted-foreground text-sm">
							No reactions yet.
						</p>
					) : (
						<ul className="divide-y divide-border/60">
							{used.map((type) => {
								const n = counts.get(type) ?? 0;
								const pct = local.total > 0 ? (n / local.total) * 100 : 0;
								const isMine = local.my === type;
								return (
									<li
										key={type}
										className={cn("relative", isMine && "bg-primary/[0.04]")}
									>
										<span
											aria-hidden
											className="absolute inset-y-0 left-0 bg-primary/[0.07]"
											style={{ width: `${Math.max(2, pct)}%` }}
										/>
										<div className="relative z-10 flex items-center gap-3 px-5 py-3">
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
													{pct.toFixed(0)}% of all reactions
												</p>
											</div>
											<span className="font-semibold text-base text-foreground tabular-nums">
												{n}
											</span>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}

export function PostReactionBar({
	post,
	sessionUserId,
}: {
	post: PostRowType;
	sessionUserId: string | undefined;
}) {
	const qc = useQueryClient();
	const addAnchorRef = useRef<HTMLButtonElement>(null);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [breakdownOpen, setBreakdownOpen] = useState(false);
	const [pickerPos, setPickerPos] = useState({ left: 0, top: 0 });

	const [local, setLocal] = useState<LocalRx>(() => ({
		my: post.myReactionType ?? undefined,
		total: post.totalReactions,
		by: [...post.reactionsByType],
	}));
	const localRef = useRef(local);

	useEffect(() => {
		const next = {
			my: post.myReactionType ?? undefined,
			total: post.totalReactions,
			by: [...post.reactionsByType],
		};
		setLocal(next);
		localRef.current = next;
	}, [post.myReactionType, post.totalReactions, post.reactionsByType]);

	useEffect(() => {
		localRef.current = local;
	}, [local]);

	const setRx = useMutation(
		orpc.reaction.set.mutationOptions({
			onMutate: async (vars) => {
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
			onSettled: () => invalidateHomePostFeed(qc),
		}),
	);

	const commitType = (t: ReactionType | null) => {
		setRx.mutate({
			postId: post.id,
			type: t,
		});
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
					"inline-flex h-8 min-w-9 items-center gap-1.5 rounded-md border px-2 text-xs leading-none transition-colors",
					isMine
						? "border-primary/55 bg-primary/10 text-foreground"
						: "border-border bg-card text-foreground",
					interactive
						? "hover:border-primary/35 hover:bg-muted/60"
						: "cursor-default opacity-90",
					setRx.isPending && interactive && "opacity-70",
				)}
			>
				<span className="text-base leading-none" aria-hidden>
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
						"inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border border-border border-dashed px-2 text-muted-foreground text-xs transition-colors",
						"hover:border-primary/40 hover:bg-muted/60 hover:text-foreground",
						setRx.isPending && "opacity-70",
					)}
				>
					<SmilePlusIcon className="size-4" strokeWidth={1.75} />
					{local.by.length === 0 ? (
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
						search={{ redirect_url: "/" }}
					>
						Log in
					</Link>{" "}
					to react
				</p>
			) : null}

			<ReactionBreakdownDialog
				open={breakdownOpen}
				onOpenChange={setBreakdownOpen}
				local={local}
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
