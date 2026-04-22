import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import { Button } from "@xamsa/ui/components/button";
import { Spinner } from "@xamsa/ui/components/spinner";
import { ClockIcon, HistoryIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { RecentGameRowItem } from "@/components/home/recent-game-row";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/history/")({
	component: HistoryPage,

	beforeLoad: async () => {
		const session = await getUser();
		if (!session?.user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect_url: "/history" },
			});
		}
		return { session };
	},

	head: () =>
		pageSeo({
			title: "Game history",
			description:
				"Review your past Xamsa games: hosts, packs, and results from recent live quiz sessions.",
			path: "/history/",
			noIndex: true,
			keywords: "Xamsa history, past games, quiz sessions",
		}),
});

function HistoryPage() {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useInfiniteQuery({
		...orpc.user.getRecentGames.infiniteOptions({
			input: (pageParam: string | undefined) => ({
				cursor: pageParam,
				limit: PAGE_SIZE,
			}),
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
	});

	const rows = data?.pages.flatMap((page) => page.items) ?? [];
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!sentinelRef.current) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0 },
		);
		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return (
		<div className="container mx-auto max-w-3xl space-y-6 py-8">
			<div className="space-y-2">
				<h1 className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight">
					<HistoryIcon className="size-5" strokeWidth={1.75} />
					Game history
				</h1>
				<p className="text-muted-foreground text-sm">
					Every game you've hosted or played, newest first.
				</p>
			</div>

			{isLoading ? (
				<div className="flex justify-center py-12">
					<Spinner />
				</div>
			) : isError ? (
				<Alert variant="error">
					<AlertTitle>Failed to load your history</AlertTitle>
					<AlertDescription>
						Something went wrong. Please try refreshing the page.
					</AlertDescription>
				</Alert>
			) : rows.length === 0 ? (
				<div className="rounded-xl border border-border border-dashed p-10 text-center">
					<div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
						<ClockIcon className="size-5 text-muted-foreground" />
					</div>
					<h2 className="mt-4 font-semibold">No games yet</h2>
					<p className="mx-auto mt-1 max-w-sm text-muted-foreground text-sm">
						Host a pack or join a game from a code to see it show up here.
					</p>
					<Button className="mt-4" render={<Link to="/play" />}>
						<PlayIcon />
						Start playing
					</Button>
				</div>
			) : (
				<>
					<div className="grid gap-2">
						{rows.map((row) => (
							<RecentGameRowItem key={row.code} row={row} />
						))}
					</div>
					<div ref={sentinelRef} className="h-1" />
					{isFetchingNextPage && (
						<div className="flex justify-center py-4">
							<Spinner />
						</div>
					)}
				</>
			)}
		</div>
	);
}
