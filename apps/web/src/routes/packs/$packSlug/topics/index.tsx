import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import { ArrowLeftIcon, ArrowUpDown, PlusIcon } from "lucide-react";
import { PackTopicsList } from "@/components/pack-topics-list";
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
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData
					? `${loaderData.name} topics — Xamsa`
					: "Pack topics — Xamsa",
			},
			{
				name: "description",
				content: loaderData?.description || "List of topics in the pack",
			},
			{
				name: "og:title",
				content: loaderData
					? `${loaderData.name} topics by ${loaderData.author.name} — Xamsa`
					: "Pack topics — Xamsa",
			},
			{
				name: "og:description",
				content: loaderData?.description || "List of topics in the pack",
			},
		],
	}),
});

function RouteComponent() {
	const { packSlug } = Route.useParams();
	const pack = Route.useLoaderData();

	return (
		<div className="container mx-auto max-w-3xl space-y-6 py-10">
			<div className="space-y-4">
				<Button
					variant="ghost"
					size="sm"
					render={<Link to="/packs/$packSlug" params={{ packSlug }} />}
				>
					<ArrowLeftIcon />
					{pack.name}
				</Button>

				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl tracking-tight">Topics</h1>
						<p className="mt-1 text-muted-foreground text-sm">
							Manage the topics and questions in this pack.
						</p>
					</div>

					{pack.isAuthor && pack.status === "draft" && (
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
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
					)}
				</div>
			</div>

			<PackTopicsList limit={25} packSlug={packSlug} isAuthor={pack.isAuthor} />
		</div>
	);
}
