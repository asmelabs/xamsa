import { createFileRoute } from "@tanstack/react-router";
import { ogPngResponse, renderOgPng } from "@/lib/og/render";
import { JoinOg } from "@/lib/og/templates/join";

export const Route = createFileRoute("/api/og/join.png")({
	server: {
		handlers: {
			GET: async () => {
				const png = await renderOgPng(<JoinOg />);
				return ogPngResponse(png);
			},
		},
	},
});
