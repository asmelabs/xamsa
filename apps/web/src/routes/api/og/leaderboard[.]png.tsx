import { createFileRoute } from "@tanstack/react-router";
import { getLeaderboardOgData } from "@xamsa/api/og-data";
import { ogPngResponse, renderOgPng } from "@/lib/og/render";
import { LeaderboardOg } from "@/lib/og/templates/leaderboard";

export const Route = createFileRoute("/api/og/leaderboard.png")({
	server: {
		handlers: {
			GET: async () => {
				const top = await getLeaderboardOgData();
				const png = await renderOgPng(
					<LeaderboardOg data={{ board: "elo", top }} />,
				);
				return ogPngResponse(png);
			},
		},
	},
});
