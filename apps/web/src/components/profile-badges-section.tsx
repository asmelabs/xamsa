import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { BadgeId } from "@xamsa/schemas/modules/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { cn } from "@xamsa/ui/lib/utils";
import {
	ALL_BADGE_IDS,
	BADGE_CATEGORIES,
	type BadgeCategory,
	getBadge,
} from "@xamsa/utils/badges";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { orpc } from "@/utils/orpc";

type Props = {
	username: string;
};

const RECENT_LIMIT = 6;

const CATEGORY_LABEL: Record<BadgeCategory, string> = {
	skill: "Skill",
	struggle: "Struggle",
	moment: "Moment",
	dedication: "Dedication",
	creator: "Creator",
	host: "Host",
	discovery: "Discovery",
};

export function ProfileBadgesSection({ username }: Props) {
	const { data: summary } = useQuery(
		orpc.badge.getPublicSummaryByUsername.queryOptions({
			input: { username },
		}),
	);

	const { data: recent } = useQuery(
		orpc.badge.listPublicAwardsByUsername.queryOptions({
			input: { username, limit: RECENT_LIMIT },
		}),
	);

	const [tab, setTab] = useState<"earned" | "missing">("earned");
	const [showAll, setShowAll] = useState(false);
	const [open, setOpen] = useState(false);
	const [detailId, setDetailId] = useState<BadgeId | null>(null);

	const { data: detailPage } = useQuery({
		...orpc.badge.listPublicAwardsByUsername.queryOptions({
			input: { username, badgeId: detailId ?? undefined, limit: 30 },
		}),
		enabled: open && detailId != null,
	});

	const countBy = useMemo(
		() => new Map((summary?.rows ?? []).map((r) => [r.badgeId, r] as const)),
		[summary],
	);

	const earnedIds = useMemo(
		() => ALL_BADGE_IDS.filter((id) => (countBy.get(id)?.count ?? 0) > 0),
		[countBy],
	);
	const missingIds = useMemo(
		() => ALL_BADGE_IDS.filter((id) => (countBy.get(id)?.count ?? 0) === 0),
		[countBy],
	);

	const visibleIds = tab === "earned" ? earnedIds : missingIds;
	const grouped = useMemo(() => {
		const map = new Map<BadgeCategory, BadgeId[]>();
		for (const cat of BADGE_CATEGORIES) map.set(cat, []);
		for (const id of visibleIds) {
			const cat = getBadge(id).category;
			const arr = map.get(cat);
			if (arr) arr.push(id);
		}
		return map;
	}, [visibleIds]);

	const totalEarned = earnedIds.length;
	const totalMissing = missingIds.length;
	const recentItems = recent?.items ?? [];

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
					Badges
				</h2>
				<Link
					className="text-muted-foreground text-xs hover:underline"
					to="/badges"
				>
					Browse all
				</Link>
			</div>

			{recentItems.length > 0 ? (
				<div className="space-y-2">
					<p className="text-[11px] text-muted-foreground uppercase tracking-wider">
						Recently earned
					</p>
					<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
						{recentItems.map((it) => {
							const def = getBadge(it.badgeId);
							return (
								<Link
									key={it.id}
									to="/badges/$badgeId/awards/$awardId"
									params={{ badgeId: it.badgeId, awardId: it.id }}
									className="flex w-44 shrink-0 flex-col gap-1 rounded-lg border border-border bg-card px-2.5 py-2 transition-colors hover:bg-muted/40"
								>
									<span className="flex items-center gap-1.5">
										<span className="text-base leading-none" aria-hidden>
											{def.icon}
										</span>
										<span className="truncate font-medium text-xs">
											{def.name}
										</span>
									</span>
									<span className="line-clamp-1 text-[11px] text-muted-foreground">
										{it.game.pack.name}
									</span>
									<span className="mt-auto text-[10px] text-muted-foreground">
										{format(new Date(it.earnedAt), "MMM d, yyyy")}
									</span>
								</Link>
							);
						})}
					</div>
				</div>
			) : null}

			<div className="flex items-center gap-1.5">
				<TabPill active={tab === "earned"} onClick={() => setTab("earned")}>
					Earned · {totalEarned}
				</TabPill>
				<TabPill active={tab === "missing"} onClick={() => setTab("missing")}>
					Not yet · {totalMissing}
				</TabPill>
			</div>

			<div className="space-y-3">
				{BADGE_CATEGORIES.map((cat) => {
					const ids = grouped.get(cat) ?? [];
					if (ids.length === 0) return null;
					const trimmed = showAll ? ids : ids.slice(0, 4);
					return (
						<div key={cat} className="space-y-1.5">
							<p className="text-[11px] text-muted-foreground uppercase tracking-wider">
								{CATEGORY_LABEL[cat]} · {ids.length}
							</p>
							<div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4">
								{trimmed.map((id) => {
									const def = getBadge(id);
									const row = countBy.get(id);
									return (
										<button
											key={id}
											type="button"
											className="flex items-start gap-1.5 rounded-md border border-border/80 bg-card p-2 text-left transition-colors hover:bg-muted/40"
											onClick={() => {
												setDetailId(id);
												setOpen(true);
											}}
										>
											<span className="text-lg leading-none" aria-hidden>
												{def.icon}
											</span>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-xs leading-tight">
													{def.name}
												</p>
												<p className="text-[11px] text-muted-foreground leading-snug">
													{row && row.count > 0
														? `${row.count}×${
																row.lastEarnedAt
																	? ` · last ${format(new Date(row.lastEarnedAt), "MMM d, yyyy")}`
																	: ""
															}`
														: "Not earned yet"}
												</p>
											</div>
										</button>
									);
								})}
							</div>
						</div>
					);
				})}
				{visibleIds.length > 4 && !showAll ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowAll(true)}
						className="w-full"
					>
						Show all
					</Button>
				) : null}
			</div>

			<Dialog
				open={open}
				onOpenChange={(v) => {
					setOpen(v);
					if (!v) setDetailId(null);
				}}
			>
				<DialogPopup className="max-w-lg" showCloseButton>
					<DialogHeader>
						<DialogTitle>
							{detailId ? getBadge(detailId).name : "Badges"}
						</DialogTitle>
						<DialogDescription>
							Games where this player earned the badge.
						</DialogDescription>
					</DialogHeader>
					<DialogPanel className="max-h-72 space-y-2 overflow-y-auto">
						{detailPage && detailId ? (
							detailPage.items.length === 0 ? (
								<p className="text-muted-foreground text-sm">No entries.</p>
							) : (
								<ul className="space-y-1.5 text-sm">
									{detailPage.items.map((it) => (
										<li
											key={it.id}
											className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1"
										>
											<Link
												className="font-medium hover:underline"
												to="/badges/$badgeId/awards/$awardId"
												params={{ badgeId: detailId, awardId: it.id }}
											>
												{it.game.pack.name} · {it.game.code}
											</Link>
											<span className="text-muted-foreground text-xs">
												{it.topic
													? `Topic ${it.topic.order}: ${it.topic.name}`
													: null}
												{it.questionOrder != null
													? ` · Q${it.questionOrder}`
													: ""}
												{" · "}
												{format(new Date(it.earnedAt), "PPp")}
											</span>
										</li>
									))}
								</ul>
							)
						) : (
							<p className="text-muted-foreground text-sm">Loading…</p>
						)}
					</DialogPanel>
				</DialogPopup>
			</Dialog>
		</section>
	);
}

interface TabPillProps {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}

function TabPill({ active, onClick, children }: TabPillProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"rounded-full border px-3 py-1 text-xs transition-colors",
				active
					? "border-primary bg-primary/15 font-semibold text-foreground"
					: "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
			)}
		>
			{children}
		</button>
	);
}
