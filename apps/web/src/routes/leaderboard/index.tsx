import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { GlobalLeaderboardBoardType } from "@xamsa/schemas/modules/user";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@xamsa/ui/components/tabs";
import { CrownIcon, MedalIcon, TrendingUpIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

const BOARDS: {
	id: GlobalLeaderboardBoardType;
	label: string;
	hint: string;
}[] = [
	{
		id: "elo",
		label: "Elo",
		hint: "Competitive rating (3+ games as player)",
	},
	{ id: "xp", label: "XP / Level", hint: "Progression across all games" },
	{ id: "wins", label: "Wins", hint: "First-place finishes" },
	{ id: "points", label: "Points", hint: "Total score earned" },
];

export const Route = createFileRoute("/leaderboard/")({
	head: () =>
		pageSeo({
			title: "Leaderboard",
			description:
				"Global Xamsa rankings: Elo, XP and level, wins, and career points. Compare players who host and play live buzzer quizzes.",
			path: "/leaderboard/",
			keywords:
				"Xamsa leaderboard, Elo, quiz rankings, trivia, global rankings, XP",
		}),
	component: RouteComponent,
});

function RouteComponent() {
	const [board, setBoard] = useState<GlobalLeaderboardBoardType>("elo");

	return (
		<div className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
			<div className="space-y-2">
				<div className="flex items-center gap-2 text-primary">
					<TrendingUpIcon className="size-7" />
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						Leaderboard
					</h1>
				</div>
				<p className="text-muted-foreground text-sm sm:text-base">
					Global rankings from finished games. Elo updates on ranked sessions
					with at least two players; XP includes hosting bonuses.
				</p>
			</div>

			<Tabs
				value={board}
				onValueChange={(v) => setBoard(v as GlobalLeaderboardBoardType)}
			>
				<TabsList
					variant="underline"
					className="w-full min-w-0 flex-wrap justify-start gap-1"
				>
					{BOARDS.map((b) => (
						<TabsTab key={b.id} value={b.id}>
							{b.label}
						</TabsTab>
					))}
				</TabsList>
				{BOARDS.map((b) => (
					<TabsPanel key={b.id} value={b.id} className="mt-4">
						<p className="mb-4 text-muted-foreground text-sm">{b.hint}</p>
						<LeaderboardBoard key={b.id} board={b.id} active={board === b.id} />
					</TabsPanel>
				))}
			</Tabs>
		</div>
	);
}

function rankDisplay(rank: number) {
	if (rank === 1) {
		return (
			<span className="inline-flex items-center justify-center text-amber-600 dark:text-amber-400">
				<CrownIcon className="size-4" />
			</span>
		);
	}
	if (rank === 2) {
		return (
			<span className="inline-flex items-center justify-center text-zinc-500">
				<MedalIcon className="size-4" />
			</span>
		);
	}
	if (rank === 3) {
		return (
			<span className="inline-flex items-center justify-center text-orange-700 dark:text-orange-500">
				<MedalIcon className="size-4" />
			</span>
		);
	}
	return <span className="text-muted-foreground tabular-nums">{rank}</span>;
}

function LeaderboardBoard({
	board,
	active,
}: {
	board: GlobalLeaderboardBoardType;
	active: boolean;
}) {
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
	} = useInfiniteQuery({
		...orpc.user.getGlobalLeaderboard.infiniteOptions({
			input: (pageParam: string | undefined) => ({
				board,
				limit: 50,
				cursor: pageParam,
			}),
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
		enabled: active,
	});

	const rows = data?.pages.flatMap((p) => p.items) ?? [];
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!active || !sentinelRef.current) return;
		const el = sentinelRef.current;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [active, hasNextPage, isFetchingNextPage, fetchNextPage]);

	if (!active) {
		return null;
	}

	if (isLoading) {
		return (
			<div className="flex justify-center py-16">
				<Spinner />
			</div>
		);
	}

	if (isError) {
		return (
			<Alert variant="error">
				<AlertTitle>Could not load leaderboard</AlertTitle>
				<AlertDescription>
					Something went wrong. Try again in a moment.
				</AlertDescription>
			</Alert>
		);
	}

	if (rows.length === 0) {
		return (
			<p className="py-12 text-center text-muted-foreground text-sm">
				No players on this board yet. Finish a few games to appear here.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<Table variant="card">
				<TableHeader>
					<TableRow>
						<TableHead className="w-12">#</TableHead>
						<TableHead>Player</TableHead>
						<TableHead
							className={
								board === "elo" ? "font-semibold text-foreground" : undefined
							}
						>
							Elo
						</TableHead>
						<TableHead
							className={
								board === "xp" ? "font-semibold text-foreground" : undefined
							}
						>
							Lv / XP
						</TableHead>
						<TableHead
							className={
								board === "wins" ? "font-semibold text-foreground" : undefined
							}
						>
							Wins
						</TableHead>
						<TableHead>Games</TableHead>
						<TableHead
							className={
								board === "points" ? "font-semibold text-foreground" : undefined
							}
						>
							Pts
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.username}>
							<TableCell className="w-12 text-center">
								{rankDisplay(row.rank)}
							</TableCell>
							<TableCell>
								<Link
									to="/u/$username"
									params={{ username: row.username }}
									className="flex min-w-0 items-center gap-2 hover:underline"
								>
									<Avatar className="size-8">
										{row.image ? <AvatarImage src={row.image} alt="" /> : null}
										<AvatarFallback className="text-[10px]">
											{row.name.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0">
										<p className="truncate font-medium text-sm">{row.name}</p>
										<p className="truncate text-muted-foreground text-xs">
											@{row.username}
										</p>
									</div>
								</Link>
							</TableCell>
							<TableCell className="tabular-nums">
								{row.elo.toLocaleString()}
							</TableCell>
							<TableCell className="text-sm tabular-nums">
								<span className="font-medium">{row.level}</span>
								<span className="text-muted-foreground">
									{" "}
									· {row.xp.toLocaleString()}
								</span>
							</TableCell>
							<TableCell className="tabular-nums">{row.totalWins}</TableCell>
							<TableCell className="tabular-nums">
								{row.totalGamesPlayed}
							</TableCell>
							<TableCell className="tabular-nums">
								{row.totalPointsEarned.toLocaleString()}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<div ref={sentinelRef} className="h-4" />

			{hasNextPage ? (
				<div className="flex justify-center">
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={isFetchingNextPage}
						onClick={() => fetchNextPage()}
					>
						{isFetchingNextPage ? "Loading…" : "Load more"}
					</Button>
				</div>
			) : null}
		</div>
	);
}
