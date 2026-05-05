import { createFileRoute } from "@tanstack/react-router";
import { getBadgeAwardOgData } from "@xamsa/api/og-data";
import { ogImageResponse } from "@/lib/og/render";
import { BadgeAwardOg } from "@/lib/og/templates/badge-award";

export const Route = createFileRoute(
	"/api/og/badges/$badgeId/awards/$awardId/og.png",
)({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const data = await getBadgeAwardOgData(params.awardId);
				if (!data || data.badgeId !== params.badgeId) {
					return new Response("Not found", { status: 404 });
				}
				return ogImageResponse(<BadgeAwardOg data={data} />);
			},
		},
	},
});
