import { createFileRoute } from "@tanstack/react-router";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/leaderboard/")({
	head: () =>
		pageSeo({
			title: "Leaderboard",
			description:
				"See top players and scores on Xamsa. The leaderboard highlights who’s winning as you play and host live quiz rounds with friends.",
			path: "/leaderboard/",
			keywords: "Xamsa leaderboard, quiz rankings, trivia scores, top players",
		}),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="container mx-auto max-w-7xl space-y-4 py-10">
			<h1 className="font-bold text-2xl tracking-tight">Leaderboard</h1>
			<p className="text-center text-muted-foreground">
				This page is not implemented yet. Check back later for rankings and
				stats.
			</p>
		</div>
	);
}
