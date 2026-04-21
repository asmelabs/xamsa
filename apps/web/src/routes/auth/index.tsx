import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/")({
	loader: async () => {
		throw redirect({
			to: "/auth/login",
		});
	},
});
