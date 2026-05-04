import { createFileRoute } from "@tanstack/react-router";
import { getPostOgData } from "@xamsa/api/og-data";
import { ogImageResponse } from "@/lib/og/render";
import { PostOg } from "@/lib/og/templates/post";

export const Route = createFileRoute("/api/og/post/$postSlug/og.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const data = await getPostOgData(params.postSlug);
				if (!data) {
					return new Response("Not found", { status: 404 });
				}
				return ogImageResponse(<PostOg data={data} />);
			},
		},
	},
});
