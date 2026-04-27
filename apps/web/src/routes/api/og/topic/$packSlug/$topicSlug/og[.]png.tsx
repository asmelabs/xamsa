import { createFileRoute } from "@tanstack/react-router";
import { getTopicOgData } from "@xamsa/api/og-data";
import { ogImageResponse } from "@/lib/og/render";
import { TopicOg } from "@/lib/og/templates/topic";

export const Route = createFileRoute(
	"/api/og/topic/$packSlug/$topicSlug/og.png",
)({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const topic = await getTopicOgData(params.packSlug, params.topicSlug);
				if (!topic) {
					return new Response("Not found", { status: 404 });
				}
				return ogImageResponse(<TopicOg data={topic} />);
			},
		},
	},
});
