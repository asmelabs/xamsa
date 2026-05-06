import { Link } from "@tanstack/react-router";
import type {
	GetPostInsightsOutputType,
	PostInsightsRosterMemberType,
} from "@xamsa/schemas/modules/post";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import {
	BookmarkIcon,
	EyeIcon,
	MessageCircleIcon,
	SmileIcon,
	TrendingUpIcon,
} from "lucide-react";
import { reactionEmoji } from "@/components/reactions/reaction-bar";
import { StatCard } from "@/components/stats/stat-card";

interface PostInsightsViewProps {
	data: GetPostInsightsOutputType;
}

const PERCENT_FORMATTER = new Intl.NumberFormat(undefined, {
	style: "percent",
	maximumFractionDigits: 1,
});

export function PostInsightsView({ data }: PostInsightsViewProps) {
	const { totals, reactionsByType, commentsBreakdown, rankings } = data;
	const totalCommentsBreakdown =
		commentsBreakdown.topLevel + commentsBreakdown.replies;
	const ratioLabel = PERCENT_FORMATTER.format(totals.viewToEngagementRatio);

	const maxReactionCount = reactionsByType.reduce(
		(acc, row) => (row.count > acc ? row.count : acc),
		0,
	);

	return (
		<div className="space-y-6">
			<section aria-labelledby="post-insights-headline" className="space-y-3">
				<h2
					id="post-insights-headline"
					className="font-semibold text-muted-foreground text-sm uppercase tracking-wider"
				>
					Headline
				</h2>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
					<StatCard
						icon={EyeIcon}
						label="Views"
						value={totals.views.toLocaleString()}
						hint={`${ratioLabel} engagement`}
					/>
					<StatCard
						icon={SmileIcon}
						label="Reactions"
						value={totals.reactions.toLocaleString()}
					/>
					<StatCard
						icon={MessageCircleIcon}
						label="Comments"
						value={totals.comments.toLocaleString()}
					/>
					<StatCard
						icon={BookmarkIcon}
						label="Bookmarks"
						value={totals.bookmarks.toLocaleString()}
					/>
				</div>
			</section>

			<section
				aria-labelledby="post-insights-reactions"
				className="space-y-3 rounded-xl border border-border bg-background p-4"
			>
				<div className="flex items-center justify-between">
					<h2
						id="post-insights-reactions"
						className="font-semibold text-muted-foreground text-sm uppercase tracking-wider"
					>
						Reactions by emoji
					</h2>
					<span className="text-muted-foreground text-xs tabular-nums">
						{totals.reactions.toLocaleString()} total
					</span>
				</div>
				{reactionsByType.length === 0 ? (
					<p className="text-muted-foreground text-sm">No reactions yet.</p>
				) : (
					<ul className="space-y-2">
						{reactionsByType.map((row) => {
							const pct =
								maxReactionCount > 0 ? (row.count / maxReactionCount) * 100 : 0;
							return (
								<li key={row.type} className="flex items-center gap-3 text-sm">
									<span className="w-7 text-lg" aria-hidden>
										{reactionEmoji(row.type)}
									</span>
									<span className="w-16 text-muted-foreground capitalize">
										{row.type}
									</span>
									<div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
										<div
											className="h-full rounded-full bg-primary transition-[width]"
											style={{ width: `${pct}%` }}
										/>
									</div>
									<span className="w-10 text-right tabular-nums">
										{row.count.toLocaleString()}
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</section>

			<section
				aria-labelledby="post-insights-comments"
				className="space-y-3 rounded-xl border border-border bg-background p-4"
			>
				<div className="flex items-center justify-between">
					<h2
						id="post-insights-comments"
						className="font-semibold text-muted-foreground text-sm uppercase tracking-wider"
					>
						Comments breakdown
					</h2>
					<span className="text-muted-foreground text-xs tabular-nums">
						{totalCommentsBreakdown.toLocaleString()} total
					</span>
				</div>
				{totalCommentsBreakdown === 0 ? (
					<p className="text-muted-foreground text-sm">No comments yet.</p>
				) : (
					<>
						<div className="flex h-3 overflow-hidden rounded-full border border-border bg-muted">
							<div
								className="h-full bg-primary"
								style={{
									width: `${
										(commentsBreakdown.topLevel / totalCommentsBreakdown) * 100
									}%`,
								}}
								title={`${commentsBreakdown.topLevel} top-level`}
							/>
							<div
								className="h-full bg-chart-3"
								style={{
									width: `${
										(commentsBreakdown.replies / totalCommentsBreakdown) * 100
									}%`,
								}}
								title={`${commentsBreakdown.replies} replies`}
							/>
						</div>
						<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
							<span className="inline-flex items-center gap-1.5">
								<span className="size-2 rounded-full bg-primary" aria-hidden />
								Top-level{" "}
								<span className="font-medium text-foreground tabular-nums">
									{commentsBreakdown.topLevel.toLocaleString()}
								</span>
							</span>
							<span className="inline-flex items-center gap-1.5">
								<span className="size-2 rounded-full bg-chart-3" aria-hidden />
								Replies{" "}
								<span className="font-medium text-foreground tabular-nums">
									{commentsBreakdown.replies.toLocaleString()}
								</span>
							</span>
						</div>
					</>
				)}
			</section>

			<section aria-labelledby="post-insights-rankings" className="space-y-4">
				<h2
					id="post-insights-rankings"
					className="flex items-center gap-2 font-semibold text-muted-foreground text-sm uppercase tracking-wider"
				>
					<TrendingUpIcon className="size-3.5" />
					Rankings
				</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<RosterCard
						title="Top commenters"
						emptyText="No comments yet."
						members={rankings.topCommenters}
						trailing={(m) =>
							m.count !== undefined
								? `${m.count.toLocaleString()} ${
										m.count === 1 ? "comment" : "comments"
									}`
								: ""
						}
					/>
					<RosterCard
						title="First reactors"
						emptyText="No reactions yet."
						members={rankings.firstReactors}
						trailing={(m) =>
							m.reactionType ? reactionEmoji(m.reactionType) : ""
						}
					/>
					<RosterCard
						title="First commenters"
						emptyText="No comments yet."
						members={rankings.firstCommenters}
						trailing={(m) => (m.at ? formatRelativeShort(m.at) : "")}
					/>
					<RosterCard
						title="First bookmarkers"
						emptyText="No bookmarks yet."
						members={rankings.firstBookmarkers}
						trailing={(m) => (m.at ? formatRelativeShort(m.at) : "")}
					/>
				</div>
			</section>
		</div>
	);
}

function RosterCard({
	title,
	members,
	trailing,
	emptyText,
}: {
	title: string;
	members: PostInsightsRosterMemberType[];
	trailing: (m: PostInsightsRosterMemberType) => string;
	emptyText: string;
}) {
	return (
		<div className="space-y-3 rounded-xl border border-border bg-background p-4">
			<h3 className="font-medium text-foreground text-sm">{title}</h3>
			{members.length === 0 ? (
				<p className="text-muted-foreground text-sm">{emptyText}</p>
			) : (
				<ul className="space-y-2">
					{members.map((m) => (
						<li key={m.username} className="flex items-center gap-3 text-sm">
							<Avatar className="size-7 shrink-0">
								<AvatarImage src={m.image ?? undefined} alt="" />
								<AvatarFallback className="text-[10px]">
									{m.username.slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<Link
									to="/u/$username"
									params={{ username: m.username }}
									className="block truncate font-medium text-foreground hover:underline"
								>
									{m.name ?? m.username}
								</Link>
								<p className="truncate text-muted-foreground text-xs">
									@{m.username}
								</p>
							</div>
							<span className="shrink-0 text-muted-foreground text-xs">
								{trailing(m)}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function formatRelativeShort(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const diffMs = Date.now() - d.getTime();
	const diffSec = Math.max(0, Math.round(diffMs / 1000));
	if (diffSec < 60) return `${diffSec}s ago`;
	const diffMin = Math.round(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffH = Math.round(diffMin / 60);
	if (diffH < 24) return `${diffH}h ago`;
	const diffD = Math.round(diffH / 24);
	if (diffD < 30) return `${diffD}d ago`;
	const diffMo = Math.round(diffD / 30);
	if (diffMo < 12) return `${diffMo}mo ago`;
	const diffY = Math.round(diffMo / 12);
	return `${diffY}y ago`;
}
