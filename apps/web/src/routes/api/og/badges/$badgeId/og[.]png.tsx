import { createFileRoute } from "@tanstack/react-router";
import { BadgeIdSchema } from "@xamsa/schemas/modules/badge";
import { getBadge } from "@xamsa/utils/badges";
import { ogImageResponse } from "@/lib/og/render";
import { BadgeOg } from "@/lib/og/templates/badge";

export const Route = createFileRoute("/api/og/badges/$badgeId/og.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const parsed = BadgeIdSchema.safeParse(params.badgeId);
				if (!parsed.success) {
					return new Response("Not found", { status: 404 });
				}
				const badge = getBadge(parsed.data);
				return ogImageResponse(
					<BadgeOg
						data={{
							id: badge.id,
							name: badge.name,
							description: badge.description,
						}}
					/>,
				);
			},
		},
	},
});
