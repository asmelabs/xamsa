import { createFileRoute } from "@tanstack/react-router";
import { ogImageResponse } from "@/lib/og/render";
import { PlayOg } from "@/lib/og/templates/play";

export const Route = createFileRoute("/api/og/play.png")({
	server: {
		handlers: {
			GET: async () => ogImageResponse(<PlayOg />),
		},
	},
});
