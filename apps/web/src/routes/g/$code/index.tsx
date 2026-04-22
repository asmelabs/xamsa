// src/routes/g/$code/index.tsx

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Spinner } from "@xamsa/ui/components/spinner";
import { EndGameScreen } from "@/components/end-game-screen";
import { HostView } from "@/components/host-view";
import { PlayerView } from "@/components/player-view";
import { useGameChannel } from "@/hooks/use-game-channel";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

function gameStatusLabel(status: string) {
	switch (status) {
		case "waiting":
			return "Waiting to start";
		case "active":
			return "Live";
		case "paused":
			return "Paused";
		case "completed":
			return "Finished";
		default:
			return "In session";
	}
}

export const Route = createFileRoute("/g/$code/")({
	component: RouteComponent,
	loader: async ({ params, context }) => {
		const game = await context.queryClient.ensureQueryData(
			orpc.game.findOne.queryOptions({ input: { code: params.code } }),
		);
		return { code: params.code, game };
	},
	head: ({ loaderData }) => {
		if (!loaderData?.game) {
			return pageSeo({
				title: "Game room",
				description:
					"Join or host a live Xamsa quiz session with a room code. Real-time buzzer play with your group.",
				noIndex: true,
			});
		}
		const { game } = loaderData;
		const status = gameStatusLabel(game.status);
		const desc = `Live Xamsa game room (code ${game.code}) using the pack “${game.pack.name}”. ${status}. Hosts and players use this page to run the session together—share the code so others can join.`;
		return pageSeo({
			title: `${status} · ${game.pack.name}`,
			description: desc,
			path: `/g/${game.code}/`,
			ogTitle: `Game · ${game.pack.name}`,
			ogDescription: desc,
			keywords: `Xamsa, live quiz, game room, ${game.pack.name}, buzzer`,
			noIndex: true,
		});
	},
});

function RouteComponent() {
	const { code } = Route.useLoaderData();
	useGameChannel(code);

	const { data: game } = useQuery(
		orpc.game.findOne.queryOptions({ input: { code } }),
	);

	if (!game) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	// Once the game is finalized, both host and players see the same
	// celebratory end-game screen instead of the in-game host/player views.
	if (game.status === "completed") {
		return (
			<div className="min-h-screen bg-muted/30">
				<EndGameScreen game={game} />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-muted/30">
			{game.isHost ? <HostView game={game} /> : <PlayerView game={game} />}
		</div>
	);
}
