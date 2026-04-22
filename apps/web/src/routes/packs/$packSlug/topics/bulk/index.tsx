import { createFileRoute, redirect } from "@tanstack/react-router";
import { BulkCreateTopicsForm } from "@/components/bulk-create-topics-form";
import {
	PacksBreadcrumb,
	PacksSubpageContainer,
	PacksSubpageHeader,
} from "@/components/packs";
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
	const { pack } = Route.useLoaderData();
	return (
		<PacksSubpageContainer>
			<PacksBreadcrumb
				items={[
					{ label: "Packs", to: "/packs" },
					{
						label: pack.name,
						to: "/packs/$packSlug",
						params: { packSlug: pack.slug },
					},
					{
						label: "Topics",
						to: "/packs/$packSlug/topics",
						params: { packSlug: pack.slug },
					},
					{ label: "Bulk add topics", current: true },
				]}
			/>
			<PacksSubpageHeader
				description="Paste or import several topics at once while this pack is still a draft. Large imports may finish in the background — keep the page open."
				eyebrow="Pack editor"
				title="Create multiple topics"
			/>
			<BulkCreateTopicsForm packSlug={pack.slug} />
		</PacksSubpageContainer>
	);
}
