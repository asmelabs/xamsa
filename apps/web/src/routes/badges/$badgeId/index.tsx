import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeIdSchema } from "@xamsa/schemas/modules/badge";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { Button } from "@xamsa/ui/components/button";
import { Spinner } from "@xamsa/ui/components/spinner";
import { getBadge } from "@xamsa/utils/badges";
import { useEffect } from "react";
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
			keywords: `Xamsa, badge, ${meta.name}, ${badgeId}, trivia, quiz`,
		});
	},
});

function RouteComponent() {
	const { badgeId, meta } = Route.useLoaderData();

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery({
			...orpc.badge.listEarners.infiniteOptions({
				input: (pageParam: string | undefined) => ({
					badgeId,
					limit: 20,
					cursor: pageParam,
				}),
				initialPageParam: undefined as string | undefined,
				getNextPageParam: (lastPage) =>
					lastPage.metadata.nextCursor ?? undefined,
			}),
		});

	const items = data?.pages.flatMap((p) => p.items) ?? [];

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
				<h2 className="font-semibold text-lg">Recent earners</h2>
				{isLoading ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : items.length === 0 ? (
					<p className="text-muted-foreground text-sm">No one yet.</p>
				) : (
					<ul className="flex flex-col gap-2">
						{items.map((row) => (
							<li
								key={row.id}
								className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm"
							>
								<Link
									className="flex min-w-0 items-center gap-2 font-medium hover:underline"
									params={{ username: row.user.username }}
									to="/u/$username"
								>
									<Avatar className="size-8">
										<AvatarImage src={row.user.image ?? undefined} />
										<AvatarFallback>
											{(row.user.name || row.user.username).slice(0, 1)}
										</AvatarFallback>
									</Avatar>
									<span className="truncate">
										{row.user.name || row.user.username}
									</span>
								</Link>
								<div className="text-right text-muted-foreground text-xs sm:text-sm">
									<Link
										className="hover:underline"
										to="/g/$code"
										params={{ code: row.game.code }}
									>
										Game {row.game.code}
									</Link>
									{row.topic ? (
										<span>
											{" "}
											· T{row.topic.order} {row.topic.name}
											{row.questionOrder != null
												? ` · Q${row.questionOrder}`
												: ""}
										</span>
									) : null}
									<div>{new Date(row.earnedAt).toLocaleString()}</div>
								</div>
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
