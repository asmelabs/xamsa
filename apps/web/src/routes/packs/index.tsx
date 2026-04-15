import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/packs/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/packs/"!</div>;
}
