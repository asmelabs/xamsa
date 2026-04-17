import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/packs/$packSlug/topics/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/packs/$packSlug/topics/"!</div>;
}
