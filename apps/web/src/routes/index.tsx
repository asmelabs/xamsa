import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import {
	Dialog,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import { Skeleton } from "@xamsa/ui/components/skeleton";
import {
	ArrowRightIcon,
	FlameIcon,
	GamepadIcon,
	HistoryIcon,
	LogInIcon,
	Package,
	PencilLineIcon,
	Play,
	SparklesIcon,
	SwordsIcon,
	TargetIcon,
	TrendingUpIcon,
	TrophyIcon,
	ZapIcon,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { CreatePostComposer, HomeMixedFeed } from "@/components/home/home-feed";
import { HomeGlobalSearch } from "@/components/home/home-global-search";
import { RecentGameRowItem } from "@/components/home/recent-game-row";
import { TrendingPackTile } from "@/components/home/trending-pack-tile";
import { StatCard } from "@/components/stats/stat-card";
import { formatRatio, StatsGrid } from "@/components/stats/stats-grid";
import { getUser } from "@/functions/get-user";
import {
	homePostListInfiniteOptions,
	invalidateHomePostFeed,
} from "@/lib/home-post-feed-query";
import { siteJsonLd } from "@/lib/json-ld";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	head: () =>
		pageSeo({
			titleIsFull: true,
			title: "Xamsa — Live party quiz & buzzer games",
			description: DEFAULT_DESCRIPTION,
			path: "/",
			keywords: DEFAULT_KEYWORDS,
			jsonLd: siteJsonLd(),
		}),
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		const session = context.session;

		const basePosts = () =>
			context.queryClient.prefetchInfiniteQuery({
				...homePostListInfiniteOptions(),
			});

		await basePosts().catch(() => null);

		await context.queryClient
			.ensureQueryData(
				orpc.pack.list.queryOptions({
					input: {
						limit: 6,
						statuses: ["published"],
						sort: "popular",
						dir: "desc",
					},
				}),
			)
			.catch(() => null);

		if (session?.user) {
			await Promise.all([
				context.queryClient
					.ensureQueryData(orpc.user.getActiveGame.queryOptions({ input: {} }))
					.catch(() => null),
				context.queryClient
					.ensureQueryData(orpc.user.getMyStats.queryOptions({ input: {} }))
					.catch(() => null),
				context.queryClient
					.ensureQueryData(
						orpc.user.getRecentGames.queryOptions({
							input: { limit: 5 },
						}),
					)
					.catch(() => null),
			]);
		}

		return session?.user;
	},
	component: HomeComponent,
});

function HomeComponent() {
	const user = Route.useLoaderData();

	if (!user) {
		return <SignedOutHome />;
	}

	return <SignedInHome userId={user.id} userName={user.name ?? null} />;
}

function SignedOutHome() {
	return (
		<div className="flex flex-col gap-8 py-10">
			<HomeGlobalSearch />

			<div className="space-y-3">
				<div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-primary text-xs">
					<SparklesIcon className="size-3" />
					Party trivia, buzz-first
				</div>
				<h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
					Welcome to Xamsa
				</h1>
				<p className="max-w-prose text-muted-foreground">
					A buzz-to-answer party game inspired by the TV show. Host a pack,
					rally your friends, race to the buzzer.
				</p>
			</div>

			<div className="flex flex-col gap-2 sm:flex-row">
				<Button
					size="xl"
					className="flex-1"
					render={<Link to="/auth/login" search={{ redirect_url: "/play" }} />}
				>
					<LogInIcon className="size-5" />
					Log in to play
				</Button>
				<Button
					size="xl"
					variant="outline"
					className="flex-1"
					render={<Link to="/packs" />}
				>
					<Package className="size-5" />
					Browse packs
				</Button>
			</div>

			<HomeMixedFeed
				mode="signedOut"
				homeFeed="everyone"
				composerSlot={
					<p className="text-muted-foreground text-sm">
						<Link
							className="font-medium underline"
							to="/auth/login"
							search={{ redirect_url: "/" }}
						>
							Log in
						</Link>{" "}
						to create a post — everyone can read the feed.
					</p>
				}
				slots={{
					stats: null,
					recentGames: null,
					trending: <HomeTrendingPacksCarousel />,
				}}
			/>
		</div>
	);
}

function HomeTrendingPacksCarousel() {
	const { data: trendingPacks, isPending: trendingPending } = useQuery(
		orpc.pack.list.queryOptions({
			input: {
				limit: 6,
				statuses: ["published"],
				sort: "popular",
				dir: "desc",
			},
		}),
	);
	const trendingRows = trendingPacks?.items ?? [];

	return (
		<section className="min-h-44 space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="inline-flex items-center gap-2 font-semibold text-muted-foreground text-sm uppercase tracking-wider">
					<TrendingUpIcon className="size-4" strokeWidth={1.75} />
					Trending packs
				</h2>
				<Link
					to="/packs"
					className="text-muted-foreground text-xs hover:text-foreground hover:underline"
				>
					Browse all →
				</Link>
			</div>
			{trendingPending && !trendingPacks ? (
				<div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton key={i} className="h-30 w-52 shrink-0 rounded-xl" />
					))}
				</div>
			) : trendingRows.length > 0 ? (
				<div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
					{trendingRows.map((pack) => (
						<TrendingPackTile key={pack.slug} pack={pack} />
					))}
				</div>
			) : (
				<p className="text-muted-foreground text-sm">No trending packs yet.</p>
			)}
		</section>
	);
}

function StatsGridSkeleton() {
	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
			{Array.from({ length: 6 }, (_, i) => (
				<Skeleton key={i} className="h-19 rounded-xl" />
			))}
		</div>
	);
}

interface SignedInHomeProps {
	userId: string;
	userName: string | null;
}

function SignedInHome({ userId, userName }: SignedInHomeProps) {
	const qc = useQueryClient();
	const [feed, setFeed] = useQueryState(
		"feed",
		parseAsStringLiteral(["everyone", "following"] as const).withDefault(
			"everyone",
		),
	);
	const composerDockRef = useRef<HTMLDivElement>(null);
	const [composerInView, setComposerInView] = useState(true);
	const [composeOpen, setComposeOpen] = useState(false);

	useEffect(() => {
		const el = composerDockRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				setComposerInView(entry?.isIntersecting ?? false);
			},
			{ root: null, rootMargin: "-72px 0px -40px 0px", threshold: 0 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	const showComposeFab = !composerInView;

	const { data: activeGame } = useQuery(
		orpc.user.getActiveGame.queryOptions({ input: {} }),
	);
	const { data: stats, isPending: statsPending } = useQuery(
		orpc.user.getMyStats.queryOptions({ input: {} }),
	);
	const { data: recentGames } = useQuery(
		orpc.user.getRecentGames.queryOptions({ input: { limit: 5 } }),
	);

	const recentRows = recentGames?.items ?? [];

	const activeBanner = activeGame ? (
		<Link
			to="/g/$code"
			params={{ code: activeGame.code }}
			className="group flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
				<GamepadIcon className="size-5" strokeWidth={1.75} />
			</div>
			<div className="min-w-0 flex-1">
				<p className="font-semibold text-sm">
					{activeGame.status === "paused"
						? "Your game is paused"
						: "You have a game in progress"}
				</p>
				<p className="truncate text-muted-foreground text-xs">
					{activeGame.isHost ? "Hosting" : "Playing"} · Code{" "}
					<span className="font-mono">{activeGame.code}</span>
				</p>
			</div>
			<ArrowRightIcon className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
		</Link>
	) : null;

	const statsSection = stats ? (
		<StatsGrid columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
			<StatCard
				icon={ZapIcon}
				label="Level"
				value={stats.level}
				hint={`${stats.xp.toLocaleString()} XP`}
			/>
			<StatCard
				icon={SwordsIcon}
				label="Elo"
				value={stats.elo.toLocaleString()}
				hint={`peak ${stats.peakElo.toLocaleString()}`}
			/>
			<StatCard
				icon={GamepadIcon}
				label="Played"
				value={stats.totalGamesPlayed}
				hint={
					stats.derived.winRate != null
						? `${formatRatio(stats.derived.winRate, { asPercent: true })} win`
						: undefined
				}
			/>
			<StatCard
				icon={TrophyIcon}
				label="Wins"
				value={stats.totalWins}
				hint={
					stats.derived.podiumRate != null
						? `${formatRatio(stats.derived.podiumRate, { asPercent: true })} podium`
						: undefined
				}
			/>
			<StatCard
				icon={TargetIcon}
				label="Correct"
				value={
					stats.derived.correctAnswerRate != null
						? formatRatio(stats.derived.correctAnswerRate, { asPercent: true })
						: stats.totalCorrectAnswers
				}
				hint={`${stats.totalCorrectAnswers.toLocaleString()} of ${(
					stats.totalCorrectAnswers +
						stats.totalIncorrectAnswers +
						stats.totalExpiredAnswers
				).toLocaleString()}`}
			/>
			<StatCard
				icon={FlameIcon}
				label="Hosted"
				value={stats.totalGamesHosted}
				hint={
					stats.derived.avgHostMinutes != null
						? `${formatRatio(stats.derived.avgHostMinutes, { digits: 0, suffix: "m" })} avg`
						: undefined
				}
			/>
		</StatsGrid>
	) : statsPending ? (
		<StatsGridSkeleton />
	) : null;

	const recentSection = (
		<section className="space-y-3">
			<div className="flex items-center justify-between">
				<h2 className="inline-flex items-center gap-2 font-semibold text-muted-foreground text-sm uppercase tracking-wider">
					<HistoryIcon className="size-4" strokeWidth={1.75} />
					Recent games
				</h2>
				<Link
					to="/history"
					className="text-muted-foreground text-xs hover:text-foreground hover:underline"
				>
					View all →
				</Link>
			</div>
			{recentRows.length === 0 ? (
				<div className="rounded-xl border border-border border-dashed p-6 text-center text-muted-foreground text-sm">
					No games yet. Host or join one to see your history here.
				</div>
			) : (
				<div className="grid gap-2">
					{recentRows.map((row) => (
						<RecentGameRowItem key={row.code} row={row} />
					))}
				</div>
			)}
		</section>
	);
	const trendingSection = <HomeTrendingPacksCarousel />;

	return (
		<div className="relative flex flex-col gap-8 py-8">
			{showComposeFab ? (
				<Button
					type="button"
					size="icon-xl"
					aria-label="Create post"
					className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-[46] rounded-full shadow-lg md:bottom-28"
					onClick={() => setComposeOpen(true)}
				>
					<PencilLineIcon className="size-6" strokeWidth={1.75} />
				</Button>
			) : null}

			<Dialog open={composeOpen} onOpenChange={setComposeOpen}>
				<DialogPopup className="max-w-lg overflow-hidden border-0 p-0 shadow-2xl">
					<DialogHeader className="border-border border-b px-4 py-4 text-left">
						<DialogTitle>New post</DialogTitle>
					</DialogHeader>
					<DialogPanel className="px-4 pt-3 pb-4">
						<CreatePostComposer
							variant="dialog"
							onPosted={() => {
								setComposeOpen(false);
								void invalidateHomePostFeed(qc);
							}}
						/>
					</DialogPanel>
				</DialogPopup>
			</Dialog>

			<HomeGlobalSearch />

			{activeBanner}

			<div className="space-y-2">
				<h1 className="font-bold text-2xl tracking-tight">
					{userName ? `Welcome back, ${userName}` : "Welcome back"}
				</h1>
				<p className="text-muted-foreground">
					Pick up where you left off or start something new.
				</p>
			</div>

			<Button size="xl" className="w-full" render={<Link to="/play" />}>
				<Play className="size-5 fill-current" />
				Start Playing
			</Button>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-muted-foreground text-sm">Timeline</span>
				<div className="inline-flex rounded-lg border border-border p-0.5">
					<Button
						type="button"
						size="sm"
						variant={feed === "everyone" ? "secondary" : "ghost"}
						className="h-8 rounded-md px-3"
						onClick={() => void setFeed("everyone")}
					>
						Everyone
					</Button>
					<Button
						type="button"
						size="sm"
						variant={feed === "following" ? "secondary" : "ghost"}
						className="h-8 rounded-md px-3"
						onClick={() => void setFeed("following")}
					>
						Following
					</Button>
				</div>
			</div>

			<HomeMixedFeed
				mode="signedIn"
				homeFeed={feed}
				sessionUserId={userId}
				composerSlot={
					<div ref={composerDockRef}>
						<CreatePostComposer onPosted={() => {}} />
					</div>
				}
				slots={{
					stats: statsSection ?? <StatsGridSkeleton />,
					recentGames: recentSection,
					trending: trendingSection,
				}}
			/>
		</div>
	);
}
