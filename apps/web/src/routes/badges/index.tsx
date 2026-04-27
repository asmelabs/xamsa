import { createFileRoute, Link } from "@tanstack/react-router";
import { Input } from "@xamsa/ui/components/input";
import { ALL_BADGE_IDS, filterBadges } from "@xamsa/utils/badges";
import { useMemo, useState } from "react";
import { pageSeo } from "@/lib/seo";

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

function RouteComponent() {
	const [q, setQ] = useState("");
	const list = useMemo(() => {
		const idSet = new Set(ALL_BADGE_IDS);
		const fromFilter = filterBadges({});
		const merged = fromFilter.filter((b) =>
			idSet.has(b.id as (typeof ALL_BADGE_IDS)[number]),
		);
		if (!q.trim()) return merged;
		const s = q.trim().toLowerCase();
		return merged.filter(
			(b) =>
				b.id.includes(s) ||
				b.name.toLowerCase().includes(s) ||
				b.description.toLowerCase().includes(s),
		);
	}, [q]);

	return (
		<div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
			<div className="space-y-2">
				<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
					Badges
				</h1>
				<p className="text-muted-foreground text-sm sm:text-base">
					Achievements you can earn in live games. Names and rules are the same
					for every player—only the story behind each one is unique.
				</p>
			</div>
			<Input
				placeholder="Search by name, id, or description…"
				value={q}
				onChange={(e) => setQ(e.target.value)}
				aria-label="Search badges"
			/>
			<ul className="grid gap-3 sm:grid-cols-1">
				{list.map((b) => (
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
									<p className="font-semibold">{b.name}</p>
									<p className="line-clamp-2 text-muted-foreground text-sm">
										{b.description}
									</p>
									<p className="mt-1 text-muted-foreground/80 text-xs">
										{b.rarity} · {b.type}
									</p>
								</div>
							</div>
						</Link>
					</li>
				))}
			</ul>
			{list.length === 0 ? (
				<p className="text-center text-muted-foreground text-sm">No matches.</p>
			) : null}
		</div>
	);
}
