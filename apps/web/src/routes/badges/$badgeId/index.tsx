import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeIdSchema } from "@xamsa/schemas/modules/badge";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import { Spinner } from "@xamsa/ui/components/spinner";
import { getBadge } from "@xamsa/utils/badges";
import { ChevronRightIcon } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo } from "react";
import { ProfileImageLightbox } from "@/components/profile-image-lightbox";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/badges/$badgeId/")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const parsed = BadgeIdSchema.safeParse(params.badgeId);
		if (!parsed.success) {
			throw notFound();
		}
		return { badgeId: parsed.data, meta: getBadge(parsed.data) };
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Badge",
				description: "Xamsa achievement badge",
				path: "/badges/",
			});
		}
		const { meta, badgeId } = loaderData;
		const path = `/badges/${badgeId}/`;
		return pageSeo({
			title: `${meta.name} — Badge`,
			description: meta.description,
			path,
			ogTitle: meta.name,
			ogDescription: meta.description,
			ogImagePath: `/api/og/badges/${badgeId}/og.png`,
			keywords: `Xamsa, badge, ${meta.name}, ${badgeId}, trivia, quiz`,
		});
	},
});

function RouteComponent() {
	const { badgeId, meta } = Route.useLoaderData();

	const [usernameFilter, setUsernameFilter] = useQueryState(
		"u",
		parseAsString.withDefault(""),
	);
	const [gameFilter, setGameFilter] = useQueryState(
		"g",
		parseAsString.withDefault(""),
	);
	const [from, setFrom] = useQueryState("from", parseAsString.withDefault(""));
	const [to, setTo] = useQueryState("to", parseAsString.withDefault(""));

	const filtersForQuery = useMemo(() => {
		const u = usernameFilter.trim();
		const g = gameFilter.trim();
		return {
			...(u ? { username: u } : {}),
			...(g ? { gameCode: g } : {}),
			...(from ? { from: new Date(from) } : {}),
			...(to ? { to: new Date(to) } : {}),
		};
	}, [usernameFilter, gameFilter, from, to]);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery({
			...orpc.badge.listEarners.infiniteOptions({
				input: (pageParam: string | undefined) => ({
					badgeId,
					limit: 20,
					cursor: pageParam,
					...filtersForQuery,
				}),
				initialPageParam: undefined as string | undefined,
				getNextPageParam: (lastPage) =>
					lastPage.metadata.nextCursor ?? undefined,
			}),
		});

	const items = data?.pages.flatMap((p) => p.items) ?? [];
	const hasActiveFilters = !!usernameFilter || !!gameFilter || !!from || !!to;

	useEffect(() => {
		if (!hasNextPage || isFetchingNextPage) return;
		const el = document.getElementById("badge-earners-sentinel");
		if (!el) return;
		const obs = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					fetchNextPage();
				}
			},
			{ rootMargin: "200px" },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const clearFilters = () => {
		void setUsernameFilter(null);
		void setGameFilter(null);
		void setFrom(null);
		void setTo(null);
	};

	return (
		<div className="container mx-auto max-w-3xl space-y-8 px-4 py-8">
			<Link
				className="text-muted-foreground text-sm hover:underline"
				to="/badges"
			>
				← All badges
			</Link>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
				<span className="text-5xl" aria-hidden>
					{meta.icon}
				</span>
				<div>
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						{meta.name}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm sm:text-base">
						{meta.description}
					</p>
					<ul className="mt-3 list-inside list-disc text-muted-foreground text-sm">
						{meta.requirements.map((r) => (
							<li key={r}>{r}</li>
						))}
					</ul>
				</div>
			</div>

			<div className="space-y-3">
				<div className="flex items-baseline justify-between gap-3">
					<h2 className="font-semibold text-lg">Recent earners</h2>
					{hasActiveFilters ? (
						<button
							type="button"
							className="text-muted-foreground text-xs underline-offset-2 hover:underline"
							onClick={clearFilters}
						>
							Clear filters
						</button>
					) : null}
				</div>

				<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
					<Input
						placeholder="Earner username…"
						value={usernameFilter}
						onChange={(e) => void setUsernameFilter(e.target.value || null)}
						aria-label="Filter by earner username"
					/>
					<Input
						placeholder="Game code (e.g. ABC123)"
						value={gameFilter}
						onChange={(e) =>
							void setGameFilter(e.target.value.toUpperCase() || null)
						}
						aria-label="Filter by game code"
					/>
					<Input
						type="date"
						value={from}
						onChange={(e) => void setFrom(e.target.value || null)}
						aria-label="Earned on or after"
					/>
					<Input
						type="date"
						value={to}
						onChange={(e) => void setTo(e.target.value || null)}
						aria-label="Earned on or before"
					/>
				</div>

				{isLoading ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : items.length === 0 ? (
					<p className="py-6 text-center text-muted-foreground text-sm">
						{hasActiveFilters
							? "No earners match these filters."
							: "No one has earned this badge yet."}
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{items.map((row) => (
							<li key={row.id}>
								<Link
									to="/badges/$badgeId/awards/$awardId"
									params={{ badgeId, awardId: row.id }}
									className="group flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40"
								>
									<div className="flex min-w-0 flex-1 items-center gap-2">
										<ProfileImageLightbox
											name={row.user.name || row.user.username}
											image={row.user.image}
											initials={(row.user.name || row.user.username)
												.slice(0, 2)
												.toUpperCase()}
											triggerClassName="shrink-0 rounded-full [&_[data-slot=avatar]]:size-8"
										>
											<Avatar className="size-8">
												<AvatarImage src={row.user.image ?? undefined} />
												<AvatarFallback>
													{(row.user.name || row.user.username).slice(0, 1)}
												</AvatarFallback>
											</Avatar>
										</ProfileImageLightbox>
										<div className="min-w-0">
											<span className="block min-w-0 truncate font-medium">
												{row.user.name || row.user.username}
											</span>
											<span className="block min-w-0 truncate text-muted-foreground text-xs">
												@{row.user.username}
											</span>
										</div>
									</div>
									<div className="text-right text-muted-foreground text-xs sm:text-sm">
										<div className="font-mono uppercase">
											Game {row.game.code}
										</div>
										{row.topic ? (
											<div className="text-[11px]">
												T{row.topic.order} {row.topic.name}
												{row.questionOrder != null
													? ` · Q${row.questionOrder}`
													: ""}
											</div>
										) : null}
										<div className="text-[11px]">
											{new Date(row.earnedAt).toLocaleString()}
										</div>
									</div>
									<ChevronRightIcon
										aria-hidden
										className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
									/>
								</Link>
							</li>
						))}
					</ul>
				)}
				{hasNextPage ? (
					<div className="flex justify-center py-2">
						<Button
							disabled={isFetchingNextPage}
							size="sm"
							variant="outline"
							onClick={() => fetchNextPage()}
						>
							{isFetchingNextPage ? "Loading…" : "Load more"}
						</Button>
					</div>
				) : null}
				<div id="badge-earners-sentinel" className="h-1" />
			</div>
		</div>
	);
}
