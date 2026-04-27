import { createFileRoute } from "@tanstack/react-router";
import { getReleaseByCalverParam } from "@xamsa/utils/app-releases";
import { format } from "date-fns";
import { formatProductVersionLabel } from "@/lib/app-release";
import { ogImageResponse } from "@/lib/og/render";
import { ReleaseOg } from "@/lib/og/templates/release";

export const Route = createFileRoute("/api/og/whats-new/$version/og.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const release = getReleaseByCalverParam(params.version);
				if (!release) {
					return new Response("Not found", { status: 404 });
				}
				return ogImageResponse(
					<ReleaseOg
						data={{
							versionLabel: formatProductVersionLabel(release),
							title: release.title ?? null,
							releasedAt: format(new Date(release.releasedAt), "dd MMM yyyy"),
						}}
					/>,
				);
			},
		},
	},
});
