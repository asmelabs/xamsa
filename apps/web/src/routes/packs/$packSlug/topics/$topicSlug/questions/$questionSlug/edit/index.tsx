import { createFileRoute, notFound } from "@tanstack/react-router";
import {
	PacksBreadcrumb,
	PacksSubpageContainer,
	PacksSubpageHeader,
} from "@/components/packs";
import { UpdateQuestionForm } from "@/components/update-question-form";
import { pageSeo, truncateMeta } from "@/lib/seo";
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
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Edit question",
				description:
					"Update a quiz question’s text, correct answer, optional hints, and host notes inside your draft pack.",
				noIndex: true,
			});
		}
		const preview = loaderData.text?.trim() || "Quiz question";
		const desc = `Edit question ${loaderData.order} in “${loaderData.topic.name}” (${loaderData.pack.name}) on Xamsa: change wording, answer, or host notes. ${truncateMeta(preview, 100)}`;
		return pageSeo({
			title: `Edit question · ${loaderData.topic.name}`,
			description: desc,
			path: `/packs/${loaderData.pack.slug}/topics/${loaderData.topic.slug}/questions/${loaderData.slug}/edit/`,
			ogTitle: `Edit Q${loaderData.order}: ${loaderData.topic.name}`,
			ogDescription: truncateMeta(desc),
			keywords: `Xamsa, edit question, ${loaderData.topic.name}, ${loaderData.pack.name}`,
			noIndex: true,
		});
	},
});

function RouteComponent() {
	const question = Route.useLoaderData();

	return (
		<PacksSubpageContainer>
			<PacksBreadcrumb
				items={[
					{ label: "Packs", to: "/packs" },
					{
						label: question.pack.name,
						to: "/packs/$packSlug",
						params: { packSlug: question.pack.slug },
					},
					{
						label: "Topics",
						to: "/packs/$packSlug/topics",
						params: { packSlug: question.pack.slug },
					},
					{
						label: question.topic.name,
						to: "/packs/$packSlug/topics/$topicSlug",
						params: {
							packSlug: question.pack.slug,
							topicSlug: question.topic.slug,
						},
					},
					{ label: `Question ${String(question.order)}`, current: true },
				]}
			/>
			<PacksSubpageHeader
				description="Update wording, answers, acceptable alternatives, and host notes. Changes apply after you save."
				eyebrow="Pack editor"
				title="Edit question"
			/>
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
		</PacksSubpageContainer>
	);
}
