// src/routes/g/$code/index.tsx

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Spinner } from "@xamsa/ui/components/spinner";
import { EndGameScreen } from "@/components/end-game-screen";
import { HostView } from "@/components/host-view";
import { PlayerView } from "@/components/player-view";
import { useGameChannel } from "@/hooks/use-game-channel";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/g/$code/")({
	component: RouteComponent,
	loader: async ({ params, context }) => {
		// prefetch via the query client so it's cached
		await context.queryClient.ensureQueryData(
			orpc.game.findOne.queryOptions({ input: { code: params.code } }),
		);
		return { code: params.code };
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
