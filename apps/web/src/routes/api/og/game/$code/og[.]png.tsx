import { createFileRoute } from "@tanstack/react-router";
import { getGameOgData } from "@xamsa/api/og-data";
import { ogPngResponse, renderOgPng } from "@/lib/og/render";
import { GameOg } from "@/lib/og/templates/game";

function statusLabel(status: string): string {
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

export const Route = createFileRoute("/api/og/game/$code/og.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const game = await getGameOgData(params.code);
				if (!game) {
					return new Response("Not found", { status: 404 });
				}
				const png = await renderOgPng(
					<GameOg
						data={{
							code: game.code,
							packName: game.packName,
							statusLabel: statusLabel(game.status),
							playersCount: game.playersCount,
						}}
					/>,
				);
				return ogPngResponse(png);
			},
		},
	},
});
