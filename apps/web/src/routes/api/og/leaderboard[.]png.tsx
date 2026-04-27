import { createFileRoute } from "@tanstack/react-router";
import { getLeaderboardOgData } from "@xamsa/api/og-data";
import { ogImageResponse } from "@/lib/og/render";
import { LeaderboardOg } from "@/lib/og/templates/leaderboard";

export const Route = createFileRoute("/api/og/leaderboard.png")({
	server: {
		handlers: {
			GET: async () => {
				const top = await getLeaderboardOgData();
				return ogImageResponse(<LeaderboardOg data={{ board: "elo", top }} />);
			},
		},
	},
});
