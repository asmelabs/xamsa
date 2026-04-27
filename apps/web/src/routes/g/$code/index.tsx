// src/routes/g/$code/index.tsx

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { BadgeEarnedMessage } from "@xamsa/ably/channels";
import { Spinner } from "@xamsa/ui/components/spinner";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BadgeCelebrationOverlay } from "@/components/badge-celebration-overlay";
import { EndGameScreen } from "@/components/end-game-screen";
import { HostView } from "@/components/host-view";
import { PlayerView } from "@/components/player-view";
import { useGameChannel } from "@/hooks/use-game-channel";
import { gameRoomPageJsonLd } from "@/lib/json-ld";
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
			jsonLd: gameRoomPageJsonLd(game),
		});
	},
});

function RouteComponent() {
	const { code } = Route.useLoaderData();
	const navigate = useNavigate();
	const [badgeBatches, setBadgeBatches] = useState<BadgeEarnedMessage[][]>([]);
	const onBadgesEarned = useCallback((m: BadgeEarnedMessage[]) => {
		if (m.length === 0) {
			return;
		}
		setBadgeBatches((q) => [...q, m]);
	}, []);
	const consumeBadgeBatch = useCallback(() => {
		setBadgeBatches((q) => q.slice(1));
	}, []);
	useGameChannel(code, { onBadgesEarned });

	const { data: game } = useQuery(
		orpc.game.findOne.queryOptions({ input: { code } }),
	);

	const isLobbyOnlyFinished =
		game?.status === "completed" && game.startedAt == null;
	const didLobbyRedirectRef = useRef(false);

	useEffect(() => {
		if (!isLobbyOnlyFinished || didLobbyRedirectRef.current) return;
		didLobbyRedirectRef.current = true;
		toast.info("The lobby was closed before the game started.");
		void navigate({ to: "/play" });
	}, [isLobbyOnlyFinished, navigate]);

	if (!game) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	}

	// Host ended from the lobby: no scoreboard, no history — back to play.
	if (isLobbyOnlyFinished) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/30">
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
			<BadgeCelebrationOverlay
				batchQueue={badgeBatches}
				onConsume={consumeBadgeBatch}
			/>
			{game.isHost ? <HostView game={game} /> : <PlayerView game={game} />}
		</div>
	);
}
