import { createFileRoute, notFound } from "@tanstack/react-router";
import { UpdateQuestionForm } from "@/components/update-question-form";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute(
	"/packs/$packSlug/topics/$topicSlug/questions/$questionSlug/edit/",
)({
	component: RouteComponent,

	loader: async ({ params }) => {
		try {
			return await orpc.question.findOne.call({
				pack: params.packSlug,
				topic: params.topicSlug,
				question: params.questionSlug,
			});
		} catch {
			throw notFound();
		}
	},
});

function RouteComponent() {
	const question = Route.useLoaderData();

	return (
		<div>
			<UpdateQuestionForm
				questionData={{
					pack: question.pack.slug,
					topic: question.topic.slug,
					text: question.text,
					answer: question.answer,
					explanation: question.explanation,
					slug: question.slug,
					description: question.description,
				}}
			/>
		</div>
	);
}
