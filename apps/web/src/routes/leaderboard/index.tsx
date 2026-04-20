import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/leaderboard/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="container mx-auto max-w-7xl py-10">
			<p className="text-center text-muted-foreground">
				Page has not been implemented yet. Check back later for updates.
			</p>
		</div>
	);
}
