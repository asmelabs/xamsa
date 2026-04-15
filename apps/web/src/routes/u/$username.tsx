import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/u/$username")({
	component: RouteComponent,
});

function RouteComponent() {
	const { username } = Route.useParams();
	return <div>Profile: {username}</div>;
}
