import { createFileRoute } from "@tanstack/react-router";
import { ogPngResponse, renderOgPng } from "@/lib/og/render";
import { PlayOg } from "@/lib/og/templates/play";

export const Route = createFileRoute("/api/og/play.png")({
	server: {
		handlers: {
			GET: async () => {
				const png = await renderOgPng(<PlayOg />);
				return ogPngResponse(png);
			},
		},
	},
});
