import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@xamsa/ui/components/card";
import { Skeleton } from "@xamsa/ui/components/skeleton";
import {
	ArrowRightIcon,
	ClockIcon,
	CrownIcon,
	FlameIcon,
	GamepadIcon,
	HistoryIcon,
	LogInIcon,
	Package,
	Play,
	SparklesIcon,
	TargetIcon,
	TrendingUpIcon,
	TrophyIcon,
	User,
	ZapIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { HomeGlobalSearch } from "@/components/home/home-global-search";
import { RecentGameRowItem } from "@/components/home/recent-game-row";
import { StatTile } from "@/components/home/stat-tile";
import { TrendingPackTile } from "@/components/home/trending-pack-tile";
import { getUser } from "@/functions/get-user";
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

		// Warm the cache for signed-in dashboard queries so they render from
		// cache on first paint. Signed-out users don't need any of these, so
		// we gate the prefetch on session presence.
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
				context.queryClient
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
					.catch(() => null),
			]);
		}

		return session?.user;
	},
	component: HomeComponent,
});

interface NavCardProps {
	to: string;
	params?: Record<string, string>;
	icon: ReactNode;
	title: string;
	description: string;
}

function NavCard({ to, params, icon, title, description }: NavCardProps) {
	return (
		<Card
			className="group transition-colors hover:border-primary/30 hover:bg-primary/3"
			render={<Link to={to} params={params} />}
		>
			<CardHeader className="flex-row items-center gap-4">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
					{icon}
				</div>
				<div className="grid gap-0.5">
					<CardTitle className="text-base">{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
			</CardHeader>
		</Card>
	);
}

function NavTiles({ username }: { username?: string }) {
	return (
		<div className="space-y-3">
			<h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wider">
				Explore
			</h2>
			<div className="grid min-h-50 gap-3">
				<NavCard
					to="/packs"
					icon={<Package className="size-5" strokeWidth={1.75} />}
					title="Packs"
					description="Browse question packs created by the community."
				/>
				<NavCard
					to="/leaderboard"
					icon={<TrophyIcon className="size-5" strokeWidth={1.75} />}
					title="Leaderboard"
					description="See who's on top and compete for the best scores."
				/>
				{username ? (
					<NavCard
						to="/u/$username"
						params={{ username }}
						icon={<User className="size-5" strokeWidth={1.75} />}
						title="Your Profile"
						description="View your stats, packs, and account settings."
					/>
				) : null}
			</div>
		</div>
	);
}

function HomeComponent() {
	const user = Route.useLoaderData();

	if (!user) {
		return <SignedOutHome />;
	}

	return <SignedInHome userName={user.name ?? null} username={user.username} />;
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

			<NavTiles />
		</div>
	);
}

interface SignedInHomeProps {
	userName: string | null;
	username: string;
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

function SignedInHome({ userName, username }: SignedInHomeProps) {
	const { data: activeGame } = useQuery(
		orpc.user.getActiveGame.queryOptions({ input: {} }),
	);
	const { data: stats, isPending: statsPending } = useQuery(
		orpc.user.getMyStats.queryOptions({ input: {} }),
	);
	const { data: recentGames } = useQuery(
		orpc.user.getRecentGames.queryOptions({ input: { limit: 5 } }),
	);
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

	const recentRows = recentGames?.items ?? [];
	const trendingRows = trendingPacks?.items ?? [];

	return (
		<div className="flex flex-col gap-8 py-8">
			<HomeGlobalSearch />

			{activeGame && (
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
			)}

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

			<div className="min-h-19">
				{stats ? (
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
						<StatTile
							icon={ZapIcon}
							label="Level"
							value={stats.level}
							hint={`${stats.xp} XP`}
						/>
						<StatTile
							icon={GamepadIcon}
							label="Played"
							value={stats.totalGamesPlayed}
						/>
						<StatTile icon={TrophyIcon} label="Wins" value={stats.totalWins} />
						<StatTile
							icon={CrownIcon}
							label="Podiums"
							value={stats.totalPodiums}
						/>
						<StatTile
							icon={FlameIcon}
							label="Hosted"
							value={stats.totalGamesHosted}
						/>
						<StatTile
							icon={TargetIcon}
							label="Correct"
							value={stats.totalCorrectAnswers}
						/>
					</div>
				) : statsPending ? (
					<StatsGridSkeleton />
				) : null}
			</div>

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
						<ClockIcon className="mx-auto mb-2 size-5" strokeWidth={1.75} />
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
					<p className="text-muted-foreground text-sm">
						No trending packs yet.
					</p>
				)}
			</section>

			<NavTiles username={username} />
		</div>
	);
}
