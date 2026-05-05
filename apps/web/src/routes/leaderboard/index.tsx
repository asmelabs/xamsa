import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type {
	GlobalLeaderboardBoardType,
	LeaderboardPeriodType,
} from "@xamsa/schemas/modules/user";
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
import { Switch } from "@xamsa/ui/components/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xamsa/ui/components/table";
import { cn } from "@xamsa/ui/lib/utils";
import { CrownIcon, MedalIcon, TrendingUpIcon } from "lucide-react";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { ProfileImageLightbox } from "@/components/profile-image-lightbox";
import { getUser } from "@/functions/get-user";
import { collectionPageJsonLd } from "@/lib/json-ld";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

const BOARD_IDS = [
	"elo",
	"xp",
	"wins",
	"hosts",
	"plays",
] as const satisfies readonly GlobalLeaderboardBoardType[];

const PERIOD_IDS = [
	"week",
	"month",
	"year",
	"all",
] as const satisfies readonly LeaderboardPeriodType[];

const PERIODS: { id: (typeof PERIOD_IDS)[number]; label: string }[] = [
	{ id: "week", label: "This week" },
	{ id: "month", label: "This month" },
	{ id: "year", label: "This year" },
	{ id: "all", label: "All time" },
];

const BOARDS: {
	id: (typeof BOARD_IDS)[number];
	label: string;
	hint: string;
	hintWindowed: string;
}[] = [
	{
		id: "elo",
		label: "Elo",
		hint: "Competitive rating (after at least one game as a player)",
		hintWindowed:
			"Net Elo gained or lost from finished games inside the window",
	},
	{
		id: "xp",
		label: "XP",
		hint: "Progression from playing and hosting",
		hintWindowed: "Hosting XP from finished games inside the window",
	},
	{
		id: "wins",
		label: "Wins",
		hint: "First-place finishes",
		hintWindowed: "First-place finishes inside the window",
	},
	{
		id: "hosts",
		label: "Hosts",
		hint: "Total sessions hosted",
		hintWindowed: "Sessions hosted inside the window",
	},
	{
		id: "plays",
		label: "Plays",
		hint: "Total sessions joined as a player",
		hintWindowed: "Sessions joined as a player inside the window",
	},
];

export const Route = createFileRoute("/leaderboard/")({
	head: () => {
		const description =
			"Global Xamsa rankings: Elo, XP, wins, games hosted, and games played. Compare players who host and play live buzzer quizzes.";
		return pageSeo({
			title: "Leaderboard",
			description,
			path: "/leaderboard/",
			ogImagePath: "/api/og/leaderboard.png",
			keywords:
				"Xamsa leaderboard, Elo, quiz rankings, trivia, global rankings, XP",
			jsonLd: collectionPageJsonLd({
				path: "/leaderboard/",
				title: "Leaderboard",
				description,
			}),
		});
	},
	loader: async () => ({ session: await getUser() }),
	component: RouteComponent,
});

function RouteComponent() {
	const { session } = Route.useLoaderData();
	const [tab, setTab] = useQueryState(
		"tab",
		parseAsStringLiteral(BOARD_IDS).withDefault("elo"),
	);
	const [period, setPeriod] = useQueryState(
		"period",
		parseAsStringLiteral(PERIOD_IDS).withDefault("all"),
	);
	const [onlyFollowingParam, setOnlyFollowingParam] = useQueryState(
		"only-followers",
		parseAsBoolean.withDefault(false),
	);
	const effectiveOnlyFollowing = !!session?.user && onlyFollowingParam;
	const currentBoard = BOARDS.find((b) => b.id === tab);
	const currentHint =
		(period === "all" ? currentBoard?.hint : currentBoard?.hintWindowed) ?? "";

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
					Global rankings from finished games. Switch the time window to see
					this week's, month's, year's, or lifetime ladders side by side.
				</p>
			</div>

			<div
				role="tablist"
				aria-label="Leaderboard period"
				className="flex flex-wrap gap-1 rounded-lg border border-border/80 bg-card p-1"
			>
				{PERIODS.map((p) => (
					<button
						key={p.id}
						type="button"
						role="tab"
						aria-selected={period === p.id}
						onClick={() => void setPeriod(p.id)}
						className={cn(
							"flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
							period === p.id
								? "bg-primary/12 font-semibold text-foreground"
								: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
						)}
					>
						{p.label}
					</button>
				))}
			</div>

			<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
				<aside className="shrink-0 space-y-1 lg:w-44">
					<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
						Rank by
					</p>
					{BOARDS.map((b) => (
						<button
							key={b.id}
							type="button"
							onClick={() => void setTab(b.id)}
							className={cn(
								"w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
								tab === b.id
									? "bg-primary/12 font-semibold text-foreground"
									: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
							)}
						>
							{b.label}
						</button>
					))}
				</aside>

				<div className="min-w-0 flex-1 space-y-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-muted-foreground text-sm">{currentHint}</p>
						{session?.user ? (
							<label className="flex cursor-pointer items-center gap-2 text-sm">
								<Switch
									checked={onlyFollowingParam}
									onCheckedChange={(c) =>
										void setOnlyFollowingParam(c ?? false)
									}
								/>
								<span className="font-medium">Only following</span>
							</label>
						) : null}
					</div>
					<LeaderboardBoard
						board={tab}
						period={period}
						onlyFollowing={effectiveOnlyFollowing}
					/>
				</div>
			</div>
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
	period,
	onlyFollowing,
}: {
	board: GlobalLeaderboardBoardType;
	period: LeaderboardPeriodType;
	onlyFollowing: boolean;
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
				period,
				limit: 50,
				cursor: pageParam,
				onlyFollowing,
			}),
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
	});

	const rows = data?.pages.flatMap((p) => p.items) ?? [];
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!sentinelRef.current) return;
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
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
				{onlyFollowing
					? "No one you follow appears on this board yet, or you are not following anyone."
					: period !== "all"
						? "No qualifying activity in this window yet. Try a longer period or come back later."
						: "No players on this board yet. Finish a few games to appear here."}
			</p>
		);
	}

	const metricHead =
		period !== "all"
			? board === "elo"
				? "Elo Δ"
				: board === "xp"
					? "XP gained"
					: board === "wins"
						? "Wins"
						: board === "hosts"
							? "Hosted"
							: "Plays"
			: board === "elo"
				? "Elo"
				: board === "xp"
					? "Lv / XP"
					: board === "wins"
						? "Wins"
						: board === "hosts"
							? "Hosted"
							: "Plays";

	const formatPeriodValue = (value: number) => {
		if (board === "elo") {
			const sign = value > 0 ? "+" : value < 0 ? "" : "";
			return `${sign}${value.toLocaleString()}`;
		}
		return value.toLocaleString();
	};

	return (
		<div className="space-y-4">
			<Table variant="card">
				<TableHeader>
					<TableRow>
						<TableHead className="w-12">#</TableHead>
						<TableHead>Player</TableHead>
						<TableHead className="text-end sm:text-start">
							{metricHead}
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
								<div className="flex min-w-0 items-center gap-2">
									<ProfileImageLightbox
										name={row.name}
										image={row.image}
										initials={row.name.slice(0, 2).toUpperCase()}
										triggerClassName="shrink-0 rounded-full [&_[data-slot=avatar]]:size-8"
									>
										<Avatar className="size-8">
											{row.image ? (
												<AvatarImage src={row.image} alt="" />
											) : null}
											<AvatarFallback className="text-[10px]">
												{row.name.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									</ProfileImageLightbox>
									<Link
										to="/u/$username"
										params={{ username: row.username }}
										className="min-w-0 flex-1 hover:underline"
									>
										<p className="truncate font-medium text-sm">{row.name}</p>
										<p className="truncate text-muted-foreground text-xs">
											@{row.username}
										</p>
									</Link>
								</div>
							</TableCell>
							<TableCell className="tabular-nums">
								{period !== "all" ? (
									<span
										className={cn(
											"font-medium text-sm",
											board === "elo" && row.periodValue > 0
												? "text-emerald-600 dark:text-emerald-400"
												: board === "elo" && row.periodValue < 0
													? "text-red-600 dark:text-red-400"
													: undefined,
										)}
									>
										{formatPeriodValue(row.periodValue)}
									</span>
								) : board === "elo" ? (
									row.elo.toLocaleString()
								) : board === "xp" ? (
									<span className="text-sm">
										<span className="font-medium">{row.level}</span>
										<span className="text-muted-foreground">
											{" "}
											· {row.xp.toLocaleString()}
										</span>
									</span>
								) : board === "wins" ? (
									row.totalWins
								) : board === "hosts" ? (
									row.totalGamesHosted
								) : (
									row.totalGamesPlayed
								)}
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
