import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/packs/$packSlug/topics/$topicSlug/questions/$questionSlug/",
)({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div>
			Hello "/packs/$packSlug/topics/$topicSlug/questions/$questionSlug/"!
		</div>
	);
}
