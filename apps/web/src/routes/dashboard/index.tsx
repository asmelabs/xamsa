import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { GetAdminOverviewOutputType } from "@xamsa/schemas/modules/admin";
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
import { Spinner } from "@xamsa/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xamsa/ui/components/table";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

const SECTIONS = [
	{
		to: "/dashboard/badges",
		title: "Badges",
		hint: "Catalog stats and filters",
	},
	{ to: "/dashboard/packs", title: "Packs", hint: "All packs (unfiltered)" },
	{ to: "/dashboard/users", title: "Users", hint: "Accounts and roles" },
	{ to: "/dashboard/games", title: "Games", hint: "Sessions and codes" },
	{ to: "/dashboard/topics", title: "Topics", hint: "Across all packs" },
	{ to: "/dashboard/questions", title: "Questions", hint: "Across all topics" },
	{ to: "/dashboard/posts", title: "Posts", hint: "Community feed posts" },
	{
		to: "/dashboard/comments",
		title: "Comments",
		hint: "All comments + replies",
	},
	{ to: "/dashboard/clicks", title: "Clicks", hint: "Buzzer events" },
	{ to: "/dashboard/jobs", title: "Bulk jobs", hint: "Topic import jobs" },
] as const;

export const Route = createFileRoute("/dashboard/")({
	component: DashboardHome,
	head: () =>
		pageSeo({
			title: "Staff dashboard",
			description:
				"Overview of moderator and admin list tools for Xamsa content and users.",
			path: "/dashboard/",
			noIndex: true,
		}),
});

function DashboardHome() {
	const { data, isLoading, isError } = useQuery(
		orpc.admin.getOverview.queryOptions({ input: {} }),
	);

	return (
		<div className="space-y-8">
			<header>
				<p className="text-muted-foreground text-sm">
					Site-wide health, recent activity, and quick links into the moderator
					and admin tools.
				</p>
			</header>

			{isError ? (
				<Alert variant="error">
					<AlertTitle>Could not load overview</AlertTitle>
					<AlertDescription>
						Something went wrong fetching dashboard stats.
					</AlertDescription>
				</Alert>
			) : null}

			{isLoading || !data ? (
				<div className="flex justify-center py-16">
					<Spinner />
				</div>
			) : (
				<>
					<TotalsSection
						totals={data.totals}
						recent7d={data.recent7d}
						roles={data.roles}
					/>
					<ActivitySection points={data.activity14d} />
					<div className="grid gap-6 lg:grid-cols-2">
						<TopCreatorsSection rows={data.topCreators} />
						<TopPlayersSection rows={data.topPlayers} />
					</div>
					<RecentGamesSection rows={data.recentGames} />
					<JobsSection jobs={data.jobs} />
				</>
			)}

			<QuickLinksSection />
		</div>
	);
}

type OverviewData = GetAdminOverviewOutputType;

function StatTile({
	label,
	value,
	delta,
	deltaLabel,
}: {
	label: string;
	value: number;
	delta?: number;
	deltaLabel?: string;
}) {
	return (
		<div className="rounded-lg border border-border/80 bg-card px-4 py-3">
			<p className="text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</p>
			<p className="font-semibold text-2xl tabular-nums">
				{value.toLocaleString()}
			</p>
			{typeof delta === "number" ? (
				<p className="text-muted-foreground text-xs">
					<span
						className={
							delta > 0
								? "text-emerald-600 dark:text-emerald-400"
								: delta < 0
									? "text-red-600 dark:text-red-400"
									: undefined
						}
					>
						{delta > 0 ? "+" : ""}
						{delta.toLocaleString()}
					</span>{" "}
					{deltaLabel ?? "in 7d"}
				</p>
			) : null}
		</div>
	);
}

function TotalsSection({
	totals,
	recent7d,
	roles,
}: {
	totals: OverviewData["totals"];
	recent7d: OverviewData["recent7d"];
	roles: OverviewData["roles"];
}) {
	return (
		<section className="space-y-3">
			<div className="flex items-baseline justify-between">
				<h2 className="font-heading font-semibold text-lg">Site totals</h2>
				<p className="text-muted-foreground text-xs">
					Deltas show new rows in the last 7 days
				</p>
			</div>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				<StatTile label="Users" value={totals.users} delta={recent7d.users} />
				<StatTile label="Games" value={totals.games} delta={recent7d.games} />
				<StatTile label="Posts" value={totals.posts} delta={recent7d.posts} />
				<StatTile
					label="Comments"
					value={totals.comments}
					delta={recent7d.comments}
				/>
				<StatTile
					label="Badge awards"
					value={totals.badgeAwards}
					delta={recent7d.badgeAwards}
				/>
				<StatTile label="Packs" value={totals.packs} />
				<StatTile label="Topics" value={totals.topics} />
				<StatTile label="Questions" value={totals.questions} />
				<StatTile label="Reactions" value={totals.reactions} />
				<StatTile label="Clicks" value={totals.clicks} />
			</div>
			{roles.length > 0 ? (
				<p className="text-muted-foreground text-xs">
					<span className="font-medium text-foreground">Roles:</span>{" "}
					{roles
						.map((r) => `${r.role}: ${r.count.toLocaleString()}`)
						.join(" · ")}
				</p>
			) : null}
		</section>
	);
}

function ActivitySection({ points }: { points: OverviewData["activity14d"] }) {
	const data = points.map((p) => ({
		...p,
		label: p.date.slice(5), // MM-DD
	}));
	return (
		<section className="space-y-3">
			<h2 className="font-heading font-semibold text-lg">
				Activity (last 14 days)
			</h2>
			<div className="rounded-lg border border-border/80 bg-card p-4">
				<div className="h-[220px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data}>
							<CartesianGrid strokeDasharray="3 3" opacity={0.25} />
							<XAxis dataKey="label" tickLine={false} fontSize={11} />
							<YAxis tickLine={false} allowDecimals={false} fontSize={11} />
							<Tooltip
								cursor={{ opacity: 0.1 }}
								contentStyle={{ fontSize: 12 }}
							/>
							<Bar
								dataKey="games"
								stackId="a"
								name="Games"
								fill="var(--chart-1)"
							/>
							<Bar
								dataKey="users"
								stackId="a"
								name="New users"
								fill="var(--chart-2)"
							/>
							<Bar
								dataKey="posts"
								stackId="a"
								name="Posts"
								fill="var(--chart-3)"
							/>
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		</section>
	);
}

function UserMini({
	username,
	name,
	image,
}: {
	username: string;
	name: string;
	image: string | null;
}) {
	return (
		<div className="flex min-w-0 items-center gap-2">
			<Avatar className="size-7">
				{image ? <AvatarImage src={image} alt="" /> : null}
				<AvatarFallback className="text-[10px]">
					{name.slice(0, 2).toUpperCase()}
				</AvatarFallback>
			</Avatar>
			<Link
				to="/u/$username"
				params={{ username }}
				className="min-w-0 truncate font-medium text-sm hover:underline"
			>
				{name}
				<span className="text-muted-foreground"> @{username}</span>
			</Link>
		</div>
	);
}

function TopCreatorsSection({ rows }: { rows: OverviewData["topCreators"] }) {
	return (
		<section className="space-y-3">
			<h2 className="font-heading font-semibold text-lg">Top creators</h2>
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">No published packs yet.</p>
			) : (
				<Table variant="card">
					<TableHeader>
						<TableRow>
							<TableHead>Author</TableHead>
							<TableHead className="text-end">Packs</TableHead>
							<TableHead className="text-end">Plays</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.username}>
								<TableCell>
									<UserMini
										username={row.username}
										name={row.name}
										image={row.image}
									/>
								</TableCell>
								<TableCell className="text-end tabular-nums">
									{row.publishedPacks}
								</TableCell>
								<TableCell className="text-end tabular-nums">
									{row.totalPlays.toLocaleString()}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</section>
	);
}

function TopPlayersSection({ rows }: { rows: OverviewData["topPlayers"] }) {
	return (
		<section className="space-y-3">
			<h2 className="font-heading font-semibold text-lg">Top players</h2>
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">No ranked players yet.</p>
			) : (
				<Table variant="card">
					<TableHeader>
						<TableRow>
							<TableHead>Player</TableHead>
							<TableHead className="text-end">Elo</TableHead>
							<TableHead className="text-end">Wins</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.username}>
								<TableCell>
									<UserMini
										username={row.username}
										name={row.name}
										image={row.image}
									/>
								</TableCell>
								<TableCell className="text-end tabular-nums">
									{row.elo.toLocaleString()}
								</TableCell>
								<TableCell className="text-end tabular-nums">
									{row.totalWins}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</section>
	);
}

function formatRelative(date: Date): string {
	const diff = Date.now() - new Date(date).getTime();
	const min = Math.floor(diff / 60_000);
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const d = Math.floor(hr / 24);
	return `${d}d ago`;
}

function RecentGamesSection({ rows }: { rows: OverviewData["recentGames"] }) {
	return (
		<section className="space-y-3">
			<h2 className="font-heading font-semibold text-lg">Recent games</h2>
			{rows.length === 0 ? (
				<p className="text-muted-foreground text-sm">No completed games yet.</p>
			) : (
				<Table variant="card">
					<TableHeader>
						<TableRow>
							<TableHead>Finished</TableHead>
							<TableHead>Host</TableHead>
							<TableHead>Pack</TableHead>
							<TableHead>Players</TableHead>
							<TableHead>Winner</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.id}>
								<TableCell className="text-muted-foreground text-sm">
									{formatRelative(row.finishedAt)}
								</TableCell>
								<TableCell>
									<UserMini
										username={row.hostUsername}
										name={row.hostName}
										image={null}
									/>
								</TableCell>
								<TableCell className="text-sm">
									{row.packName ?? (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell className="tabular-nums">
									{row.playerCount}
								</TableCell>
								<TableCell className="text-sm">
									{row.winnerUsername ? (
										<Link
											to="/u/$username"
											params={{ username: row.winnerUsername }}
											className="hover:underline"
										>
											@{row.winnerUsername}
										</Link>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</section>
	);
}

function JobsSection({ jobs }: { jobs: OverviewData["jobs"] }) {
	const hasAny =
		jobs.topicBulkPending + jobs.topicBulkRunning + jobs.topicBulkFailed24h > 0;
	return (
		<section className="space-y-3">
			<div className="flex items-baseline justify-between">
				<h2 className="font-heading font-semibold text-lg">Bulk import jobs</h2>
				<Link
					to="/dashboard/jobs"
					className="text-primary text-sm hover:underline"
				>
					Open jobs
				</Link>
			</div>
			<div className="grid gap-3 sm:grid-cols-3">
				<StatTile label="Pending" value={jobs.topicBulkPending} />
				<StatTile label="Running" value={jobs.topicBulkRunning} />
				<StatTile label="Failed (24h)" value={jobs.topicBulkFailed24h} />
			</div>
			{!hasAny ? (
				<p className="text-muted-foreground text-xs">
					No active or recently failed jobs.
				</p>
			) : null}
		</section>
	);
}

function QuickLinksSection() {
	return (
		<section className="space-y-3">
			<h2 className="font-heading font-semibold text-lg">Quick links</h2>
			<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{SECTIONS.map((s) => (
					<li key={s.to}>
						<Link
							to={s.to}
							className="block rounded-lg border border-border/80 bg-card px-4 py-3 transition-colors hover:border-border"
						>
							<span className="font-medium">{s.title}</span>
							<span className="block text-muted-foreground text-sm">
								{s.hint}
							</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
