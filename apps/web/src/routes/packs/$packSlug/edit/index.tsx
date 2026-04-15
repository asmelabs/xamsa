import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/packs/$packSlug/edit/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/packs/$packSlug/edit/"!</div>;
}
