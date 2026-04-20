import { createFileRoute, notFound } from "@tanstack/react-router";
import { EditPackForm } from "@/components/edit-pack-form";
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
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `Update ${loaderData.name} — Xamsa`
					: "Update pack — Xamsa",
			},
			{
				name: "description",
				content: loaderData?.description || "A pack of questions and answers",
			},
			{
				name: "og:title",
				content: loaderData
					? `${loaderData.name} by ${loaderData.author.name} — Xamsa`
					: "Update pack — Xamsa",
			},
			{
				name: "og:description",
				content: loaderData?.description || "A pack of questions and answers",
			},
		],
	}),
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
