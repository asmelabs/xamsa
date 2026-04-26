import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import { Button } from "@xamsa/ui/components/button";
import { Spinner } from "@xamsa/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xamsa/ui/components/table";
import { format } from "date-fns";
import { HistoryIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { collectionPageJsonLd } from "@/lib/json-ld";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

const PAGE_SIZE = 30;

export const Route = createFileRoute("/games/history/")({
	component: PublicGamesHistoryPage,
	head: () => {
		const description =
			"Public list of recently finished Xamsa games. Open any code for the full buzzer recap: scores, topics, and questions.";
		return pageSeo({
			title: "Recent games",
			description,
			path: "/games/history/",
			keywords: "Xamsa games, recent games, game stats, buzzer recap",
			jsonLd: collectionPageJsonLd({
				path: "/games/history/",
				title: "Recent games",
				description,
			}),
		});
	},
});

function PublicGamesHistoryPage() {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useInfiniteQuery({
		...orpc.game.listPublicHistory.infiniteOptions({
			input: (pageParam: string | undefined) => ({
				cursor: pageParam,
				limit: PAGE_SIZE,
			}),
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
	});

	const rows = data?.pages.flatMap((p) => p.items) ?? [];
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
		<div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
			<div className="space-y-2">
				<div className="flex items-center gap-2 text-primary">
					<HistoryIcon className="size-7" />
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						Recent games
					</h1>
				</div>
				<p className="text-muted-foreground text-sm sm:text-base">
					Recently finished games. Tap a game code (or{" "}
					<span className="text-foreground">Full recap</span>) to open the same
					detailed stats page as after a match—scores, rounds, questions, and
					every buzz.
				</p>
				<p className="text-muted-foreground text-sm">
					<Button
						variant="link"
						className="h-auto p-0 text-primary"
						render={<Link to="/play" />}
					>
						Back to Play
					</Button>
				</p>
			</div>

			{isLoading ? (
				<div className="flex justify-center py-16">
					<Spinner />
				</div>
			) : null}

			{isError ? (
				<Alert variant="error">
					<AlertTitle>Could not load games</AlertTitle>
					<AlertDescription>Try again in a moment.</AlertDescription>
				</Alert>
			) : null}

			{!isLoading && !isError && rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">No completed games yet.</p>
			) : null}

			{!isLoading && !isError && rows.length > 0 ? (
				<div className="overflow-x-auto rounded-xl border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Finished</TableHead>
								<TableHead>Code</TableHead>
								<TableHead>Pack</TableHead>
								<TableHead className="text-right">Players</TableHead>
								<TableHead className="text-right">Duration</TableHead>
								<TableHead className="text-right">Recap</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((g) => (
								<TableRow key={`${g.code}-${g.finishedAt.toISOString()}`}>
									<TableCell className="whitespace-nowrap text-muted-foreground text-sm">
										{format(g.finishedAt, "yyyy-MM-dd HH:mm")}
									</TableCell>
									<TableCell>
										<Link
											to="/g/$code/stats"
											params={{ code: g.code }}
											className="font-medium font-mono text-primary text-sm tabular-nums tracking-wide hover:underline"
										>
											{g.code}
										</Link>
									</TableCell>
									<TableCell>
										<Link
											to="/packs/$packSlug"
											params={{ packSlug: g.pack.slug }}
											className="font-medium text-foreground hover:text-primary hover:underline"
										>
											{g.pack.name}
										</Link>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{g.totalActivePlayers}
									</TableCell>
									<TableCell className="text-right text-muted-foreground text-sm">
										{g.durationSeconds != null
											? `${Math.floor(g.durationSeconds / 60)}m ${
													g.durationSeconds % 60
												}s`
											: "—"}
									</TableCell>
									<TableCell className="text-right">
										<Link
											to="/g/$code/stats"
											params={{ code: g.code }}
											className="text-primary text-sm hover:underline"
										>
											Full stats
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<div ref={sentinelRef} className="h-4" />
					{isFetchingNextPage ? (
						<div className="flex justify-center py-4">
							<Spinner className="size-6" />
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}
