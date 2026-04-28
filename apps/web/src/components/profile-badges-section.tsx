import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { BadgeId } from "@xamsa/schemas/modules/badge";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { ALL_BADGE_IDS, getBadge } from "@xamsa/utils/badges";
import { format } from "date-fns";
import { useState } from "react";
import { orpc } from "@/utils/orpc";

type Props = {
	username: string;
};

export function ProfileBadgesSection({ username }: Props) {
	const { data: summary } = useQuery(
		orpc.badge.getPublicSummaryByUsername.queryOptions({
			input: { username },
		}),
	);
	const [open, setOpen] = useState(false);
	const [detailId, setDetailId] = useState<BadgeId | null>(null);

	const { data: detailPage } = useQuery({
		...orpc.badge.listPublicAwardsByUsername.queryOptions({
			input: { username, badgeId: detailId ?? undefined, limit: 30 },
		}),
		enabled: open && detailId != null,
	});

	const countBy = new Map(
		(summary?.rows ?? []).map((r) => [r.badgeId, r] as const),
	);

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
			<div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4">
				{ALL_BADGE_IDS.map((id) => {
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
												params={{ code: it.game.code }}
												to="/g/$code"
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
