import { Link } from "@tanstack/react-router";
import type { GetCompletedGameRecapOutputType } from "@xamsa/schemas/modules/game";
import { Badge } from "@xamsa/ui/components/badge";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "@xamsa/ui/components/tooltip";
import { cn } from "@xamsa/ui/lib/utils";
import type { BadgeId } from "@xamsa/utils/badges";
import { getBadge, isBadgeId } from "@xamsa/utils/badges";

export type RecapBadgeRow =
	GetCompletedGameRecapOutputType["badgeAwards"][number];

function topicGroupKey(r: RecapBadgeRow): string {
	return `${r.topicOrder ?? "∅"}|${r.topicSlug ?? ""}|${r.topicName ?? "∅"}`;
}

function topicSectionHeading(r: RecapBadgeRow): string {
	if (r.topicName) {
		return r.topicName;
	}
	if (r.topicOrder != null) {
		return `Topic ${r.topicOrder}`;
	}
	return "This game";
}

function groupRecapRowsByTopic(rows: RecapBadgeRow[]): {
	key: string;
	heading: string;
	rows: RecapBadgeRow[];
}[] {
	const sorted = [...rows].sort((a, b) => {
		const t =
			(a.topicOrder ?? Number.POSITIVE_INFINITY) -
			(b.topicOrder ?? Number.POSITIVE_INFINITY);
		if (t !== 0) {
			return t;
		}
		const qo = (a.questionOrder ?? 0) - (b.questionOrder ?? 0);
		if (qo !== 0) {
			return qo;
		}
		return a.earnedAt.getTime() - b.earnedAt.getTime();
	});
	const order: string[] = [];
	const byKey = new Map<string, RecapBadgeRow[]>();
	for (const r of sorted) {
		const k = topicGroupKey(r);
		let bucket = byKey.get(k);
		if (!bucket) {
			bucket = [];
			byKey.set(k, bucket);
			order.push(k);
		}
		bucket.push(r);
	}
	return order.map((k) => {
		const list = byKey.get(k) ?? [];
		const first = list[0];
		if (!first) {
			return { key: k, heading: "This game", rows: list };
		}
		return { key: k, heading: topicSectionHeading(first), rows: list };
	});
}

type Props = {
	/** Per-player rows from `recap.badgeAwards` (may include invalid ids — filtered out). */
	rows: RecapBadgeRow[] | null | undefined;
	/** e.g. tighter spacing in stats page cards */
	variant?: "default" | "compact";
	className?: string;
};

/**
 * Grouped by topic: badge + optional Q for question-scoped awards. Renders
 * nothing when `rows` is empty after filtering to known badge ids.
 */
export function PlayerRecapBadges({
	rows,
	variant = "default",
	className,
}: Props) {
	const valid = (rows ?? []).filter((r) => isBadgeId(r.badgeId));
	if (valid.length === 0) {
		return null;
	}
	const topicGroups = groupRecapRowsByTopic(valid);
	const tight = variant === "compact";

	if (tight) {
		return (
			<div className={cn("mt-2 border-border/40 border-t pt-2", className)}>
				<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
					Badges
				</p>
				<div className="mt-1.5 flex flex-col gap-1.5">
					{topicGroups.map((group) => (
						<div
							key={group.key}
							className="flex flex-wrap items-start gap-x-2 gap-y-1 sm:gap-x-2.5"
						>
							<span
								className="max-w-[min(100%,11rem)] shrink-0 truncate text-[10px] text-muted-foreground leading-tight sm:max-w-[9.5rem]"
								title={group.heading}
							>
								{group.heading}
							</span>
							<div className="flex min-w-0 flex-1 flex-wrap gap-1">
								{group.rows.map((row) => {
									const def = getBadge(row.badgeId as BadgeId);
									const q =
										row.questionOrder != null ? `Q${row.questionOrder}` : null;
									const tip = [
										def.name,
										group.heading !== def.name ? group.heading : null,
										q,
									]
										.filter(Boolean)
										.join(" · ");
									return (
										<Tooltip key={row.id}>
											<TooltipTrigger
												render={
													<Badge
														variant="outline"
														size="sm"
														className="h-6 max-w-[11rem] gap-1 px-1.5 py-0 font-normal"
														render={
															<Link
																params={{ badgeId: row.badgeId }}
																to="/badges/$badgeId"
															/>
														}
													>
														<span className="shrink-0 opacity-90" aria-hidden>
															{def.icon}
														</span>
														<span className="truncate">
															{def.name}
															{q ? (
																<span className="text-muted-foreground">
																	{" "}
																	· {q}
																</span>
															) : null}
														</span>
													</Badge>
												}
											/>
											<TooltipPopup className="max-w-xs">{tip}</TooltipPopup>
										</Tooltip>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className={cn("mt-3 border-border/50 border-t pt-3", className)}>
			<p className="text-[11px] text-muted-foreground uppercase tracking-wider">
				Badges
			</p>
			<div className="mt-1.5 space-y-2">
				{topicGroups.map((group) => (
					<div key={group.key}>
						<p className="text-[11px] text-muted-foreground leading-none tracking-wide">
							{group.heading}
						</p>
						<ul className="mt-1 space-y-0.5">
							{group.rows.map((row) => {
								const def = getBadge(row.badgeId as BadgeId);
								const q =
									row.questionOrder != null ? `Q${row.questionOrder}` : null;
								return (
									<li
										key={row.id}
										className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
									>
										<Link
											className="inline-flex min-w-0 items-center gap-1.5 text-foreground text-xs hover:underline"
											params={{ badgeId: row.badgeId }}
											to="/badges/$badgeId"
										>
											<span className="shrink-0" aria-hidden>
												{def.icon}
											</span>
											<span className="truncate font-medium">{def.name}</span>
										</Link>
										{q ? (
											<span className="shrink-0 text-[10px] text-muted-foreground sm:text-xs">
												{q}
											</span>
										) : null}
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}

export function buildBadgesByPlayerId(
	rows: RecapBadgeRow[],
): Map<string, RecapBadgeRow[]> {
	const m = new Map<string, RecapBadgeRow[]>();
	for (const r of rows) {
		if (!isBadgeId(r.badgeId)) {
			continue;
		}
		const list = m.get(r.playerId) ?? [];
		list.push(r);
		m.set(r.playerId, list);
	}
	return m;
}
