import { createFileRoute } from "@tanstack/react-router";
import { getUserOgData } from "@xamsa/api/og-data";
import { ogImageResponse } from "@/lib/og/render";
import { UserOg } from "@/lib/og/templates/user";

export const Route = createFileRoute("/api/og/user/$username/og.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const user = await getUserOgData(params.username);
				if (!user) {
					return new Response("Not found", { status: 404 });
				}
				return ogImageResponse(<UserOg data={user} />);
			},
		},
	},
});
