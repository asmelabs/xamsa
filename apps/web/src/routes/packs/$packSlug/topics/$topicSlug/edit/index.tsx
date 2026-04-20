import { createFileRoute, notFound } from "@tanstack/react-router";
import { EditTopicForm } from "@/components/edit-topic-form";
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
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `${loaderData.name} — ${loaderData.pack.name} — Xamsa`
					: "Topic — Xamsa",
			},
			{
				name: "description",
				content: loaderData?.description || "A topic in a quiz pack",
			},
		],
	}),
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
