import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@xamsa/ui/components/input";
import { cn } from "@xamsa/ui/lib/utils";
import {
	ALL_BADGE_IDS,
	BADGE_RARITIES,
	BADGE_RARITY_RANK,
	type Badge,
	type BadgeRarity,
	computeBadgeRarity,
	filterBadges,
} from "@xamsa/utils/badges";
import {
	parseAsArrayOf,
	parseAsString,
	parseAsStringLiteral,
	useQueryState,
} from "nuqs";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/badges/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Badges",
			description:
				"Browse Xamsa achievement badges: topic streaks, buzzer moments, and score highs earned in live games.",
			path: "/badges/",
			keywords: "Xamsa, badges, achievements, quiz, trivia, buzzer",
		}),
});

const SORT_VALUES = ["name", "rarity", "totalEarns", "uniqueEarners"] as const;
type SortValue = (typeof SORT_VALUES)[number];

const SORT_LABEL: Record<SortValue, string> = {
	name: "Name",
	rarity: "Rarity",
	totalEarns: "Total earns",
	uniqueEarners: "Unique earners",
};

const EARNED_VALUES = ["all", "earned", "missing"] as const;

const RARITY_LABEL: Record<BadgeRarity, string> = {
	common: "Common",
	uncommon: "Uncommon",
	rare: "Rare",
	legendary: "Legendary",
};

const RARITY_PILL_CLASS: Record<BadgeRarity, string> = {
	common: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
	uncommon: "border-success/30 bg-success/10 text-success",
	rare: "border-primary/40 bg-primary/12 text-primary",
	legendary:
		"border-amber-500/40 bg-amber-500/12 text-amber-700 dark:text-amber-400",
};

function RouteComponent() {
	const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));
	const [earned, setEarned] = useQueryState(
		"earned",
		parseAsStringLiteral(EARNED_VALUES).withDefault("all"),
	);
	const [rarities, setRarities] = useQueryState(
		"r",
		parseAsArrayOf(parseAsStringLiteral(BADGE_RARITIES)).withDefault([]),
	);
	const [sort, setSort] = useQueryState(
		"sort",
		parseAsStringLiteral(SORT_VALUES).withDefault("rarity"),
	);
	const [dir, setDir] = useQueryState(
		"dir",
		parseAsStringLiteral(["asc", "desc"] as const).withDefault("asc"),
	);

	const { data: session } = authClient.useSession();
	const viewerUsername = session?.user?.username ?? null;

	const { data: viewerSummary } = useQuery({
		...orpc.badge.getPublicSummaryByUsername.queryOptions({
			input: { username: viewerUsername ?? "" },
		}),
		enabled: !!viewerUsername,
	});

	const { data: catalogStats } = useQuery({
		...orpc.badge.getCatalogStats.queryOptions({ input: {} }),
		staleTime: 60_000,
	});

	const earnedById = useMemo(() => {
		const map = new Map<string, number>();
		if (viewerSummary) {
			for (const row of viewerSummary.rows) {
				map.set(row.badgeId, row.count);
			}
		}
		return map;
	}, [viewerSummary]);

	const totalEligibleUsers = catalogStats?.totalEligibleUsers ?? 0;

	const statsById = useMemo(() => {
		const map = new Map<
			string,
			{ totalEarns: number; uniqueEarners: number; rarity: BadgeRarity }
		>();
		if (catalogStats) {
			for (const row of catalogStats.rows) {
				map.set(row.badgeId, {
					totalEarns: row.totalEarns,
					uniqueEarners: row.uniqueEarners,
					rarity: computeBadgeRarity(
						row.uniqueEarners,
						catalogStats.totalEligibleUsers,
					),
				});
			}
		}
		return map;
	}, [catalogStats]);

	const earnedTotal = useMemo(() => {
		let sum = 0;
		for (const c of earnedById.values()) sum += c > 0 ? 1 : 0;
		return sum;
	}, [earnedById]);

	const list = useMemo(() => {
		const idSet = new Set(ALL_BADGE_IDS);
		const all = filterBadges({}).filter((b) =>
			idSet.has(b.id as (typeof ALL_BADGE_IDS)[number]),
		);

		const term = q.trim().toLowerCase();
		const matches = all.filter((b) => {
			const computedRarity =
				statsById.get(b.id)?.rarity ?? ("legendary" as BadgeRarity);
			if (rarities.length > 0 && !rarities.includes(computedRarity))
				return false;
			const owned = (earnedById.get(b.id) ?? 0) > 0;
			if (earned === "earned" && !owned) return false;
			if (earned === "missing" && owned) return false;
			if (
				term &&
				!b.id.includes(term) &&
				!b.name.toLowerCase().includes(term) &&
				!b.description.toLowerCase().includes(term)
			) {
				return false;
			}
			return true;
		});

		const sorted = [...matches].sort((a, b) => {
			const dirMul = dir === "asc" ? 1 : -1;
			let cmp = 0;
			if (sort === "name") cmp = a.name.localeCompare(b.name);
			else if (sort === "rarity") {
				const ra = statsById.get(a.id)?.rarity ?? "legendary";
				const rb = statsById.get(b.id)?.rarity ?? "legendary";
				cmp = BADGE_RARITY_RANK[ra] - BADGE_RARITY_RANK[rb];
				if (cmp === 0) {
					cmp =
						(statsById.get(a.id)?.uniqueEarners ?? 0) -
						(statsById.get(b.id)?.uniqueEarners ?? 0);
				}
			} else if (sort === "totalEarns")
				cmp =
					(statsById.get(a.id)?.totalEarns ?? 0) -
					(statsById.get(b.id)?.totalEarns ?? 0);
			else if (sort === "uniqueEarners")
				cmp =
					(statsById.get(a.id)?.uniqueEarners ?? 0) -
					(statsById.get(b.id)?.uniqueEarners ?? 0);
			return cmp * dirMul || a.name.localeCompare(b.name);
		});

		return sorted;
	}, [q, rarities, earned, earnedById, sort, dir, statsById]);

	const toggleRarity = (r: BadgeRarity) => {
		void setRarities((curr) =>
			curr.includes(r) ? curr.filter((x) => x !== r) : [...curr, r],
		);
	};

	return (
		<div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
			<div className="space-y-2">
				<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
					Badges
				</h1>
				<p className="text-muted-foreground text-sm sm:text-base">
					Achievements you can earn in live games. Rarity is calculated live
					from how many players actually own each badge — chase the rare ones
					before everyone else does.
				</p>
			</div>

			<div className="space-y-3">
				<Input
					placeholder="Search by name, id, or description…"
					value={q}
					onChange={(e) => void setQ(e.target.value || null)}
					aria-label="Search badges"
				/>

				{viewerUsername ? (
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-muted-foreground text-xs uppercase tracking-wider">
							Status
						</span>
						{(["all", "earned", "missing"] as const).map((v) => {
							const count =
								v === "all"
									? ALL_BADGE_IDS.length
									: v === "earned"
										? earnedTotal
										: ALL_BADGE_IDS.length - earnedTotal;
							return (
								<FilterChip
									key={v}
									active={earned === v}
									onClick={() => void setEarned(v === "all" ? null : v)}
								>
									{v === "all" ? "All" : v === "earned" ? "Earned" : "Not yet"}
									<span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
										{count}
									</span>
								</FilterChip>
							);
						})}
					</div>
				) : (
					<div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
						<Link
							className="underline underline-offset-2 hover:text-foreground"
							to="/auth/login"
							search={{ redirect_url: "/badges" }}
						>
							Sign in
						</Link>
						<span>to filter badges by what you've already earned.</span>
					</div>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<span className="text-muted-foreground text-xs uppercase tracking-wider">
						Rarity
					</span>
					{BADGE_RARITIES.map((r) => (
						<FilterChip
							key={r}
							active={rarities.includes(r)}
							onClick={() => toggleRarity(r)}
						>
							{RARITY_LABEL[r]}
						</FilterChip>
					))}
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<span className="text-muted-foreground text-xs uppercase tracking-wider">
						Sort
					</span>
					{SORT_VALUES.map((v) => {
						const active = sort === v;
						return (
							<button
								key={v}
								type="button"
								onClick={() => {
									if (active) {
										void setDir(dir === "asc" ? "desc" : "asc");
									} else {
										void setSort(v);
									}
								}}
								className={cn(
									"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
									active
										? "border-primary bg-primary/15 text-foreground"
										: "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
								)}
								aria-pressed={active}
							>
								{SORT_LABEL[v]}
								{active ? (
									<span className="ml-0.5 font-mono text-[10px] opacity-80">
										{dir === "asc" ? "↑" : "↓"}
									</span>
								) : null}
							</button>
						);
					})}
				</div>
			</div>

			<ul className="grid gap-3 sm:grid-cols-1">
				{list.map((b) => {
					const earnedCount = earnedById.get(b.id) ?? 0;
					const stats = statsById.get(b.id);
					const computedRarity = stats?.rarity ?? "legendary";
					const sharePct =
						totalEligibleUsers > 0 && stats?.uniqueEarners != null
							? (stats.uniqueEarners / totalEligibleUsers) * 100
							: null;
					return (
						<li key={b.id}>
							<Link
								className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
								params={{ badgeId: b.id }}
								to="/badges/$badgeId"
							>
								<div className="flex items-start gap-3">
									<span className="text-2xl" aria-hidden>
										{b.icon}
									</span>
									<div className="min-w-0 flex-1">
										<div className="flex items-start justify-between gap-2">
											<p className="font-semibold">{b.name}</p>
											<div className="flex shrink-0 items-center gap-1.5">
												<span
													className={cn(
														"rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
														RARITY_PILL_CLASS[computedRarity],
													)}
												>
													{RARITY_LABEL[computedRarity]}
												</span>
												{viewerUsername && earnedCount > 0 ? (
													<span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] text-success uppercase tracking-wider">
														Earned · {earnedCount}
													</span>
												) : null}
											</div>
										</div>
										<p className="line-clamp-2 text-muted-foreground text-sm">
											{b.description}
										</p>
										<p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground/80 text-xs">
											<span>{b.type}</span>
											{stats ? (
												<>
													<span>·</span>
													<span>{stats.totalEarns.toLocaleString()} earns</span>
													<span>·</span>
													<span>
														{stats.uniqueEarners.toLocaleString()} earners
														{sharePct != null
															? ` (${sharePct.toFixed(sharePct < 1 ? 1 : 0)}%)`
															: ""}
													</span>
												</>
											) : null}
										</p>
									</div>
								</div>
							</Link>
						</li>
					);
				})}
			</ul>
			{list.length === 0 ? (
				<p className="text-center text-muted-foreground text-sm">No matches.</p>
			) : null}
		</div>
	);
}

interface FilterChipProps {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}

function FilterChip({ active, onClick, children }: FilterChipProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"inline-flex items-center rounded-full border px-2.5 py-1 text-xs transition-colors",
				active
					? "border-primary bg-primary/15 text-foreground"
					: "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
			)}
		>
			{children}
		</button>
	);
}

export type _Badge = Badge;
