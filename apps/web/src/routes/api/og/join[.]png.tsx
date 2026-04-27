import { createFileRoute } from "@tanstack/react-router";
import { ogImageResponse } from "@/lib/og/render";
import { JoinOg } from "@/lib/og/templates/join";

export const Route = createFileRoute("/api/og/join.png")({
	server: {
		handlers: {
			GET: async () => ogImageResponse(<JoinOg />),
		},
	},
});
