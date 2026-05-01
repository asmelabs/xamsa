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
import { type PointerEvent, useEffect, useRef, useState } from "react";

import { invalidateHomePostFeed } from "@/lib/home-post-feed-query";
import { orpc } from "@/utils/orpc";

const LONG_PRESS_MS = 430;

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
	title = "Reactions",
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	local: LocalRx;
	title?: string;
}) {
	const counts = countsMapFromLocal(local);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className="max-w-md p-0" showCloseButton>
				<DialogHeader className="border-border border-b px-4 py-3 text-left">
					<DialogTitle>{title}</DialogTitle>
					<p className="font-normal text-muted-foreground text-sm">
						<span className="font-medium text-foreground">{local.total}</span>
						{local.total === 1 ? " reaction" : " reactions"} total
					</p>
				</DialogHeader>
				<DialogPanel className="max-h-96 px-0 py-0">
					<ul className="divide-y divide-border">
						{ALL_REACTIONS.map((type) => {
							const n = counts.get(type) ?? 0;
							return (
								<li
									key={type}
									className="flex items-center gap-3 px-4 py-3 text-sm"
								>
									<span className="text-xl" aria-hidden>
										{reactionEmoji(type)}
									</span>
									<span className="flex-1 font-medium">
										{reactionLabel(type)}
									</span>
									<span className="text-muted-foreground tabular-nums">
										{n}
									</span>
								</li>
							);
						})}
					</ul>
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
	const anchorRef = useRef<HTMLButtonElement>(null);
	const pickerOpenRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const openedByHoldRef = useRef(false);
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
		pickerOpenRef.current = pickerOpen;
	}, [pickerOpen]);

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

	const clearTimer = () => {
		if (timerRef.current != null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	useEffect(() => {
		return () => {
			if (timerRef.current != null) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, []);

	const openPickerAtAnchor = () => {
		const el = anchorRef.current;
		if (el) {
			const r = el.getBoundingClientRect();
			setPickerPos({
				left: r.left + r.width / 2,
				top: r.top - 8,
			});
		}
		setPickerOpen(true);
	};

	const commitType = (t: ReactionType | null) => {
		const toggleOff = t !== null && local.my === t;
		setRx.mutate({
			postId: post.id,
			type: toggleOff ? null : t,
		});
		setPickerOpen(false);
	};

	const onHeartTap = () => {
		if (pickerOpenRef.current) return;
		commitType("heart");
	};

	const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
		try {
			e.currentTarget.setPointerCapture(e.pointerId);
		} catch {
			/* capture unsupported */
		}
		openedByHoldRef.current = false;
		clearTimer();
		timerRef.current = setTimeout(() => {
			openedByHoldRef.current = true;
			openPickerAtAnchor();
			clearTimer();
		}, LONG_PRESS_MS);
	};

	const releaseCapture = (
		el: HTMLButtonElement,
		pointerId: number | undefined,
	) => {
		if (
			pointerId != null &&
			typeof el.hasPointerCapture === "function" &&
			el.hasPointerCapture(pointerId)
		) {
			try {
				el.releasePointerCapture(pointerId);
			} catch {
				/* ignore */
			}
		}
	};

	const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
		releaseCapture(e.currentTarget, e.pointerId);
		clearTimer();
		if (openedByHoldRef.current) {
			openedByHoldRef.current = false;
			return;
		}
		if (!pickerOpenRef.current) {
			onHeartTap();
		}
	};

	const onPointerCancel = (e: PointerEvent<HTMLButtonElement>) => {
		releaseCapture(e.currentTarget, e.pointerId);
		clearTimer();
	};

	const countsLine =
		local.total > 0 ? (
			<button
				type="button"
				onClick={() => setBreakdownOpen(true)}
				className="flex min-h-11 w-fit max-w-full items-center rounded-lg px-0 py-2 text-left text-muted-foreground text-xs transition-colors hover:text-foreground"
			>
				<span className="hover:underline">
					<strong className="font-medium text-foreground tabular-nums">
						{local.total}
					</strong>
					{local.total === 1 ? " reaction" : " reactions"}
					<span className="text-muted-foreground"> — view breakdown</span>
				</span>
			</button>
		) : null;

	const breakdownDialog = (
		<ReactionBreakdownDialog
			open={breakdownOpen}
			onOpenChange={setBreakdownOpen}
			local={local}
		/>
	);

	if (!sessionUserId) {
		return (
			<div className="mt-3 space-y-2">
				{countsLine}
				<p className="text-muted-foreground text-xs">
					<Link
						className="underline"
						to="/auth/login"
						search={{ redirect_url: "/" }}
					>
						Log in
					</Link>{" "}
					to react
				</p>
				{breakdownDialog}
			</div>
		);
	}

	return (
		<div className="relative mt-3 space-y-1">
			<button
				ref={anchorRef}
				type="button"
				className={cn(
					"inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
					local.my !== undefined
						? "border-primary/35 bg-primary/8"
						: "border-transparent hover:bg-muted/80",
				)}
				onPointerDown={onPointerDown}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerCancel}
				disabled={setRx.isPending}
			>
				<span className="text-lg leading-none" aria-hidden>
					{local.my ? reactionEmoji(local.my) : "🤍"}
				</span>
				<span className="text-sm">
					{local.my === "heart" ? "Liked" : local.my ? "Reacted" : "Like"}
				</span>
			</button>

			{countsLine}

			{breakdownDialog}

			{pickerOpen ? (
				<>
					<button
						type="button"
						tabIndex={-1}
						className="fade-in fixed inset-0 z-40 animate-in duration-150"
						style={{ animationDuration: "120ms" }}
						aria-label="Dismiss reaction picker"
						onPointerDown={(e) => {
							e.preventDefault();
							setPickerOpen(false);
						}}
					/>
					<div
						role="listbox"
						aria-label="Choose reaction"
						className="fade-in zoom-in-95 fixed z-50 flex animate-in items-center gap-1 rounded-full border bg-popover p-2 pt-3 pr-4 pb-3 pl-4 text-lg shadow-xl duration-150"
						style={{
							animationDuration: "120ms",
							left: pickerPos.left,
							top: pickerPos.top,
							transform: "translate(-50%, -100%)",
						}}
						onPointerDown={(e) => e.stopPropagation()}
					>
						{ALL_REACTIONS.map((r) => (
							<button
								key={r}
								type="button"
								className={cn(
									"flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-accent",
									local.my === r && "bg-accent",
								)}
								onPointerUp={(ev) => {
									ev.preventDefault();
									ev.stopPropagation();
									commitType(r);
								}}
							>
								<span aria-hidden className="text-2xl">
									{reactionEmoji(r)}
								</span>
								<span className="sr-only">{r}</span>
							</button>
						))}
					</div>
				</>
			) : null}
		</div>
	);
}
