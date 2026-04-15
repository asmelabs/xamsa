import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/packs/new/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/packs/new/"!</div>;
}
