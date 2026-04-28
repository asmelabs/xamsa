import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { JoinGameForm } from "@/components/join-game-form";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/join/")({
	component: RouteComponent,

	beforeLoad: async () => {
		const session = await getUser();
		if (!session?.user) {
			throw redirect({
				to: "/auth/login",
				search: { redirect_url: "/join" },
			});
		}
		return { session };
	},

	head: () =>
		pageSeo({
			title: "Join a game",
			description:
				"Enter the code from your host to join an active Xamsa game. You’ll play in real time with buzz-in answers.",
			path: "/join/",
			noIndex: true,
			ogImagePath: "/api/og/join.png",
			keywords: "Xamsa join, game code, enter quiz room, live trivia join",
		}),
});

function RouteComponent() {
	return (
		<div className="container mx-auto max-w-md py-10">
			<Frame>
				<FrameHeader>
					<FrameTitle>Join a game</FrameTitle>
					<p className="text-muted-foreground text-sm">
						Enter the room code, or open an invite link from your host (
						<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
							…/join/YOUR-CODE
						</code>
						) to join in one step after signing in.
					</p>
				</FrameHeader>
				<FramePanel>
					<JoinGameForm />
				</FramePanel>
			</Frame>
		</div>
	);
}
