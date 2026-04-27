import { createFileRoute } from "@tanstack/react-router";
import { getPackOgData } from "@xamsa/api/og-data";
import { ogImageResponse } from "@/lib/og/render";
import { PackOg } from "@/lib/og/templates/pack";

export const Route = createFileRoute("/api/og/pack/$slug/og.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const pack = await getPackOgData(params.slug);
				if (!pack) {
					return new Response("Not found", { status: 404 });
				}
				return ogImageResponse(<PackOg data={pack} />);
			},
		},
	},
});
