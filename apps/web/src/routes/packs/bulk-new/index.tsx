import { createFileRoute, redirect } from "@tanstack/react-router";
import { BulkCreatePacksForm } from "@/components/bulk-create-packs-form";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/packs/bulk-new/")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/auth/login",
				search: {
					redirect_url: "/packs/bulk-new",
				},
			});
		}
		return context.session.user;
	},
	head: () =>
		pageSeo({
			title: "Create multiple packs",
			description: "Create several draft question packs at once on Xamsa.",
			path: "/packs/bulk-new/",
			noIndex: true,
		}),
});

function RouteComponent() {
	return (
		<div className="container mx-auto max-w-5xl py-10">
			<BulkCreatePacksForm />
		</div>
	);
}
