import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { ArrowLeftIcon, ChevronRight, EyeOff, PencilIcon } from "lucide-react";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/$packSlug/topics/$topicSlug/")({
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
	const { packSlug } = Route.useParams();
	const topic = Route.useLoaderData();

	return (
		<div className="container mx-auto max-w-3xl space-y-6 py-10">
			<Button
				variant="ghost"
				size="sm"
				render={<Link to="/packs/$packSlug/topics" params={{ packSlug }} />}
			>
				<ArrowLeftIcon />
				{topic.pack.name}
			</Button>

			<div className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<h1 className="font-bold text-2xl tracking-tight">
						#{topic.order}. {topic.name}
					</h1>
					{topic.isAuthor && topic.pack.status === "draft" && (
						<Button
							variant="outline"
							size="sm"
							render={
								<Link
									to="/packs/$packSlug/topics/$topicSlug/edit"
									params={{ packSlug, topicSlug: topic.slug }}
								/>
							}
						>
							<PencilIcon />
							Edit
						</Button>
					)}
				</div>

				{topic.description && (
					<p className="text-muted-foreground">{topic.description}</p>
				)}

				<p className="text-muted-foreground text-sm">
					by{" "}
					<Link
						to="/u/$username"
						params={{ username: topic.pack.author.username }}
						className="font-medium text-foreground hover:underline"
					>
						{topic.pack.author.name}
					</Link>
				</p>
			</div>

			<Frame>
				<FrameHeader>
					<FrameTitle>
						Questions
						{topic.questions.length > 0 && (
							<span className="ml-1.5 font-normal text-muted-foreground text-sm">
								({topic.questions.length})
							</span>
						)}
					</FrameTitle>
				</FrameHeader>
				<FramePanel>
					{!topic.isAuthor ? (
						<div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
							<EyeOff className="size-5" />
							<p className="text-sm">
								Questions are only visible to the pack author.
							</p>
						</div>
					) : topic.questions.length === 0 ? (
						<p className="py-10 text-center text-muted-foreground text-sm">
							No questions added yet.
						</p>
					) : (
						<div className="space-y-1.5">
							{topic.questions.map((question) => (
								<Link
									key={question.slug}
									to="/packs/$packSlug/topics/$topicSlug/questions/$questionSlug"
									params={{
										packSlug,
										topicSlug: topic.slug,
										questionSlug: question.slug,
									}}
									className="group flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-primary/3"
								>
									<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground text-xs transition-colors group-hover:bg-primary/10 group-hover:text-primary">
										{question.order}
									</div>
									<p className="min-w-0 flex-1 truncate text-sm">
										{question.text}
									</p>
									<span className="shrink-0 text-muted-foreground text-xs">
										{question.order * 100} pts
									</span>
									<ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
								</Link>
							))}
						</div>
					)}
				</FramePanel>
			</Frame>
		</div>
	);
}
