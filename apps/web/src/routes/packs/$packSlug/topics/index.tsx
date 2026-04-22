import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import {
	ArrowLeftIcon,
	ArrowUpDown,
	LayoutGridIcon,
	PlusIcon,
} from "lucide-react";
import { PackTopicsList } from "@/components/pack-topics-list";
import {
	PacksBreadcrumb,
	PacksSubpageContainer,
	PacksSubpageHeader,
} from "@/components/packs";
import { pageSeo, truncateMeta } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/$packSlug/topics/")({
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
				title: "Pack topics",
				description: "Topics inside a Xamsa question pack.",
			});
		}
		const desc =
			loaderData.description?.trim() ||
			`Topics in “${loaderData.name}” by ${loaderData.author.name}. Each topic holds five questions for live Xamsa games.`;
		return pageSeo({
			title: `${loaderData.name} · Topics`,
			description: desc,
			path: `/packs/${loaderData.slug}/topics/`,
			ogType: "article",
			ogTitle: `Topics · ${loaderData.name}`,
			ogDescription: truncateMeta(desc),
			keywords: `${loaderData.name}, topics, Xamsa, quiz pack, ${loaderData.author.username}`,
		});
	},
});

function RouteComponent() {
	const { packSlug } = Route.useParams();
	const pack = Route.useLoaderData();
	const topicCount = pack._count.topics;

	return (
		<PacksSubpageContainer variant="narrow">
			<PacksBreadcrumb
				items={[
					{ label: "Packs", to: "/packs" },
					{ label: pack.name, to: "/packs/$packSlug", params: { packSlug } },
					{ label: "Topics", current: true },
				]}
			/>

			<Button
				className="-mt-1 mb-4"
				size="sm"
				variant="ghost"
				render={<Link to="/packs/$packSlug" params={{ packSlug }} />}
			>
				<ArrowLeftIcon />
				<span className="min-w-0 truncate">{pack.name}</span>
			</Button>

			<PacksSubpageHeader
				actions={
					pack.isAuthor && pack.status === "draft" ? (
						<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
							<Button
								variant="outline"
								size="sm"
								className="justify-center sm:min-w-0"
								render={
									<Link
										to="/packs/$packSlug/topics/bulk"
										params={{ packSlug }}
									/>
								}
							>
								<LayoutGridIcon />
								Bulk add
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="justify-center"
								render={
									<Link
										to="/packs/$packSlug/topics/edit/reorder"
										params={{ packSlug }}
									/>
								}
							>
								<ArrowUpDown />
								Reorder
							</Button>
							<Button
								size="sm"
								className="justify-center"
								render={
									<Link
										to="/packs/$packSlug/topics/new"
										params={{ packSlug }}
									/>
								}
							>
								<PlusIcon />
								Add topic
							</Button>
						</div>
					) : undefined
				}
				description={
					topicCount === 0
						? "No topics yet. Add a topic to start building your deck."
						: `${String(topicCount)} topic${topicCount === 1 ? "" : "s"} in this pack. ${pack.isAuthor ? "Each should have five questions before you publish." : "Open a topic to browse questions when the pack is published."}`
				}
				eyebrow={pack.isAuthor ? "Your pack" : "Pack contents"}
				title="Topics"
			/>

			<PackTopicsList
				isAuthor={pack.isAuthor}
				limit={25}
				listBase="topicsPage"
				packSlug={packSlug}
			/>
		</PacksSubpageContainer>
	);
}
