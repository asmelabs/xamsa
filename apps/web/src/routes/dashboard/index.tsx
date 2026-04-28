import { createFileRoute, Link } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";

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
	return (
		<div>
			<p className="mb-4 text-muted-foreground text-sm">
				Read-only lists with search, sort, and pagination. Choose a section:
			</p>
			<ul className="grid gap-2 sm:grid-cols-2">
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
		</div>
	);
}
