import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy nested URL; post slugs are globally unique. */
export const Route = createFileRoute("/u/$username/p/$postSlug")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/p/$postSlug",
			params: { postSlug: params.postSlug },
		});
	},
	component: () => null,
});
