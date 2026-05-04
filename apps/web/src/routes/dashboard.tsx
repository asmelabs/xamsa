import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useRouterState,
} from "@tanstack/react-router";
import { cn } from "@xamsa/ui/lib/utils";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";
import { isStaffRole } from "@/lib/staff";

const DASH_LINKS = [
	{ to: "/dashboard" as const, label: "Overview" },
	{ to: "/dashboard/badges" as const, label: "Badges" },
	{ to: "/dashboard/packs" as const, label: "Packs" },
	{ to: "/dashboard/users" as const, label: "Users" },
	{ to: "/dashboard/games" as const, label: "Games" },
	{ to: "/dashboard/topics" as const, label: "Topics" },
	{ to: "/dashboard/questions" as const, label: "Questions" },
	{ to: "/dashboard/posts" as const, label: "Posts" },
	{ to: "/dashboard/comments" as const, label: "Comments" },
	{ to: "/dashboard/clicks" as const, label: "Clicks" },
	{ to: "/dashboard/jobs" as const, label: "Bulk jobs" },
] as const;

export const Route = createFileRoute("/dashboard")({
	component: DashboardLayout,
	beforeLoad: async () => {
		const session = await getUser();
		if (!session?.user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect_url: "/dashboard" },
			});
		}
		if (!isStaffRole(session.user.role)) {
			throw redirect({ to: "/" });
		}
		return { session };
	},
	head: () =>
		pageSeo({
			title: "Staff dashboard",
			description:
				"Moderator and admin tools for Xamsa: view packs, users, games, and activity.",
			path: "/dashboard/",
			noIndex: true,
		}),
});

function DashboardLayout() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<div className="pb-8">
			<header className="mb-6">
				<p className="text-muted-foreground text-sm">Staff only</p>
				<h1 className="font-heading font-semibold text-2xl tracking-tight">
					Dashboard
				</h1>
			</header>
			<nav
				aria-label="Dashboard sections"
				className="mb-6 flex flex-wrap gap-1 border-border/80 border-b pb-2"
			>
				{DASH_LINKS.map((item) => {
					const active =
						item.to === "/dashboard"
							? pathname === "/dashboard" || pathname === "/dashboard/"
							: pathname === item.to || pathname === `${item.to}/`;
					return (
						<Link
							key={item.to}
							to={item.to}
							className={cn(
								"rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
								active
									? "bg-card text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{item.label}
						</Link>
					);
				})}
			</nav>
			<Outlet />
		</div>
	);
}
