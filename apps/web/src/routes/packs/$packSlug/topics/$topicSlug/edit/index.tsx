import { createFileRoute, notFound } from "@tanstack/react-router";
import { EditTopicForm } from "@/components/edit-topic-form";
import { pageSeo, truncateMeta } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute(
	"/packs/$packSlug/topics/$topicSlug/edit/",
)({
	component: RouteComponent,

	loader: async ({ params }) => {
		try {
			return await orpc.topic.findOne.call({
				slug: params.topicSlug,
				pack: params.packSlug,
			});
		} catch {
			throw notFound();
		}
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Edit topic",
				description: "Edit a topic in your Xamsa pack.",
				noIndex: true,
			});
		}
		const desc =
			loaderData.description?.trim() ||
			`Edit topic “${loaderData.name}” in “${loaderData.pack.name}” — name, description, and linked questions on Xamsa.`;
		return pageSeo({
			title: `Edit · ${loaderData.name}`,
			description: desc,
			path: `/packs/${loaderData.pack.slug}/topics/${loaderData.slug}/edit/`,
			noIndex: true,
			ogDescription: truncateMeta(desc),
			keywords: `Xamsa, edit topic, ${loaderData.pack.name}`,
		});
	},
});

function RouteComponent() {
	const topic = Route.useLoaderData();

	return (
		<div>
			<EditTopicForm
				topicData={{
					pack: topic.pack.slug,
					slug: topic.slug,
					name: topic.name,
					description: topic.description,
				}}
			/>
		</div>
	);
}
