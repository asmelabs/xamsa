import { createFileRoute } from "@tanstack/react-router";
import { CreateTopicForm } from "@/components/create-topic-form";

const title = "Create a new topic";
const description =
	"Create a new topic for the pack on Xamsa. Topics have 5 questions and are the fundamental parts of the games.";

export const Route = createFileRoute("/packs/$packSlug/topics/new/")({
	component: RouteComponent,
	head: () => ({
		meta: [
			{ title },
			{
				name: "description",
				content: description,
			},
			{
				name: "keywords",
				content:
					"xamsa, create topic, create question, pack, topic, question, game, fun, friends",
			},
			{
				name: "og:title",
				content: title,
			},
			{
				name: "og:description",
				content: description,
			},
		],
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
