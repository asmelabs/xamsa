import { createFileRoute, redirect } from "@tanstack/react-router";
import { BulkCreateTopicsForm } from "@/components/bulk-create-topics-form";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/$packSlug/topics/bulk/")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context, params }) => {
		if (!context.session) {
			throw redirect({
				to: "/auth/login",
				search: {
					redirect_url: `/packs/${params.packSlug}/topics/bulk`,
				},
			});
		}
		const pack = await orpc.pack.findOne.call({ slug: params.packSlug });
		if (!pack.isAuthor) {
			throw redirect({ to: "/packs" });
		}
		if (pack.status !== "draft") {
			throw redirect({
				to: "/packs/$packSlug",
				params: { packSlug: params.packSlug },
			});
		}
		return { pack };
	},
	head: ({ params }) =>
		pageSeo({
			title: "Create multiple topics",
			description: "Add several topics to a draft pack at once on Xamsa.",
			path: `/packs/${params.packSlug}/topics/bulk/`,
			noIndex: true,
		}),
});

function RouteComponent() {
	const { packSlug } = Route.useParams();
	return (
		<div className="container mx-auto max-w-5xl py-10">
			<BulkCreateTopicsForm packSlug={packSlug} />
		</div>
	);
}
