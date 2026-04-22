import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { CreateTopicForm } from "@/components/create-topic-form";
import {
	PacksBreadcrumb,
	PacksSubpageContainer,
	PacksSubpageHeader,
} from "@/components/packs";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/$packSlug/topics/new/")({
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
					redirect_url: `/packs/${params.packSlug}/topics/new`,
				},
			});
		}
		const pack = await orpc.pack.findOne
			.call({ slug: params.packSlug })
			.catch(() => {
				throw notFound();
			});
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
					{ label: "New topic", current: true },
				]}
			/>
			<PacksSubpageHeader
				description="Each topic includes five questions shown in order during live games. You can draft with AI and edit before saving."
				eyebrow="Pack editor"
				title="Add a topic"
			/>
			<CreateTopicForm packSlug={pack.slug} />
		</PacksSubpageContainer>
	);
}
