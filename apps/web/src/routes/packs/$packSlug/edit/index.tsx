import { createFileRoute, notFound } from "@tanstack/react-router";
import { EditPackForm } from "@/components/edit-pack-form";
import { pageSeo, truncateMeta } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/$packSlug/edit/")({
	component: RouteComponent,

	loader: async ({ params }) => {
		try {
			return await orpc.pack.findOne.call({ slug: params.packSlug });
		} catch {
			throw notFound();
		}
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Edit pack",
				description: "Edit your Xamsa question pack, topics, and settings.",
				noIndex: true,
			});
		}
		const desc =
			loaderData.description?.trim() ||
			`Edit “${loaderData.name}”: update pack details, topics, and questions before publishing on Xamsa.`;
		return pageSeo({
			title: `Edit · ${loaderData.name}`,
			description: desc,
			path: `/packs/${loaderData.slug}/edit/`,
			noIndex: true,
			ogTitle: `Edit ${loaderData.name}`,
			ogDescription: truncateMeta(desc),
			keywords: `Xamsa, edit pack, ${loaderData.name}, quiz builder`,
		});
	},
});

function RouteComponent() {
	const pack = Route.useLoaderData();

	return (
		<div>
			<EditPackForm
				packData={{
					slug: pack.slug,
					description: pack.description,
					language: pack.language,
					visibility: pack.visibility,
				}}
			/>
		</div>
	);
}
