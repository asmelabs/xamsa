import { createFileRoute } from "@tanstack/react-router";
import { CreateTopicForm } from "@/components/create-topic-form";
import { pageSeo } from "@/lib/seo";

export const Route = createFileRoute("/packs/$packSlug/topics/new/")({
	component: RouteComponent,
	head: ({ params }) =>
		pageSeo({
			title: "Create a topic",
			description:
				"Add a new topic to your pack on Xamsa. Each topic holds five questions that appear in order during live games.",
			path: `/packs/${params.packSlug}/topics/new/`,
			noIndex: true,
			keywords:
				"Xamsa, create topic, quiz topic, five questions, pack editor, trivia builder",
		}),
});

function RouteComponent() {
	const { packSlug } = Route.useParams();

	return (
		<div className="container mx-auto max-w-5xl py-10">
			<CreateTopicForm packSlug={packSlug} />
		</div>
	);
}
