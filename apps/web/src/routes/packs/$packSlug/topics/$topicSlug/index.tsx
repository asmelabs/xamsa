import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useNavigate,
} from "@tanstack/react-router";
import { Badge } from "@xamsa/ui/components/badge";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import {
	ArrowLeftIcon,
	ArrowUpDown,
	BarChart2,
	ChevronRight,
	EyeOff,
	PencilIcon,
} from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { DeleteTopicDialog } from "@/components/delete-topic-dialog";
import { PackTopicDiscussionSection } from "@/components/pack-topic-discussion-section";
import { PacksBreadcrumb, PacksSubpageContainer } from "@/components/packs";
import { PublicAnalyticsSection } from "@/components/public-analytics-section";
import { authClient } from "@/lib/auth-client";
import { formatDifficultyDr } from "@/lib/difficulty-display";
import { topicPageJsonLd } from "@/lib/json-ld";
import { pageSeo, truncateMeta } from "@/lib/seo";
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
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Topic",
				description: "A topic inside a Xamsa question pack.",
			});
		}
		const desc =
			loaderData.description?.trim() ||
			`“${loaderData.name}” in pack “${loaderData.pack.name}” on Xamsa — five quiz questions and answers for live games.`;
		return pageSeo({
			title: `${loaderData.name} · ${loaderData.pack.name}`,
			description: desc,
			path: `/packs/${loaderData.pack.slug}/topics/${loaderData.slug}/`,
			ogType: "article",
			ogTitle: `${loaderData.name} · ${loaderData.pack.name}`,
			ogDescription: truncateMeta(desc),
			ogImagePath: `/api/og/topic/${loaderData.pack.slug}/${loaderData.slug}/og.png`,
			keywords: `${loaderData.name}, ${loaderData.pack.name}, Xamsa topic, quiz questions`,
			jsonLd: topicPageJsonLd(loaderData),
		});
	},
});

function RouteComponent() {
	const { packSlug } = Route.useParams();
	const topic = Route.useLoaderData();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const [tab, setTab] = useQueryState(
		"tab",
		parseAsStringEnum([
			"content",
			"analytics",
			"discussion",
		] as const).withDefault("content"),
	);

	const analyticsQuery = useQuery(
		orpc.topic.getAnalytics.queryOptions({
			input: { pack: packSlug, slug: topic.slug },
		}),
	);

	const showAuthorTools = topic.isAuthor && topic.pack.status === "draft";

	return (
		<PacksSubpageContainer className="space-y-6" variant="narrow">
			<PacksBreadcrumb
				items={[
					{ label: "Packs", to: "/packs" },
					{
						label: topic.pack.name,
						to: "/packs/$packSlug",
						params: { packSlug },
					},
					{
						label: "Topics",
						to: "/packs/$packSlug/topics",
						params: { packSlug },
					},
					{ label: topic.name, current: true },
				]}
			/>

			<Button
				className="-mt-1"
				size="sm"
				variant="ghost"
				render={<Link to="/packs/$packSlug/topics" params={{ packSlug }} />}
			>
				<ArrowLeftIcon />
				{topic.pack.name} · Topics
			</Button>

			{showAuthorTools && (
				<div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-border/80 border-b bg-background/95 py-2 backdrop-blur sm:mx-0 sm:py-2.5">
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
						Edit topic
					</Button>
					<Button
						variant="outline"
						size="sm"
						render={
							<Link
								to="/packs/$packSlug/topics/$topicSlug/questions/edit/reorder"
								params={{ packSlug, topicSlug: topic.slug }}
							/>
						}
					>
						<ArrowUpDown />
						Reorder questions
					</Button>
					<DeleteTopicDialog
						className="shrink-0"
						onDeleted={() => {
							void navigate({
								to: "/packs/$packSlug/topics",
								params: { packSlug },
							});
						}}
						packSlug={packSlug}
						topicName={topic.name}
						topicSlug={topic.slug}
						triggerVariant="outline"
					/>
				</div>
			)}

			<div
				className={
					showAuthorTools
						? "space-y-3 rounded-2xl border border-border/80 bg-card/30 p-5 shadow-sm/5"
						: "space-y-3"
				}
			>
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
						<span className="text-muted-foreground">
							#{String(topic.order)}
						</span>{" "}
						{topic.name}
					</h1>
					<Badge
						variant="outline"
						className="gap-1 font-normal text-[11px]"
						title="Topic difficulty (TDR) from live games in published packs"
					>
						<BarChart2 className="size-3" />
						TDR {formatDifficultyDr(topic.tdr, topic.hasRatedDifficulty)}
					</Badge>
					<Badge
						variant="secondary"
						className="gap-1 font-normal text-[11px]"
						title="Pack difficulty (PDR)"
					>
						PDR{" "}
						{formatDifficultyDr(topic.pack.pdr, topic.pack.hasRatedDifficulty)}
					</Badge>
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

			<div className="flex flex-wrap gap-2 border-border border-b pb-2">
				<Button
					type="button"
					size="sm"
					variant={tab === "content" ? "secondary" : "ghost"}
					onClick={() => void setTab("content")}
				>
					Content
				</Button>
				<Button
					type="button"
					size="sm"
					variant={tab === "analytics" ? "secondary" : "ghost"}
					onClick={() => void setTab("analytics")}
				>
					Analytics
				</Button>
				{topic.pack.status === "published" ? (
					<Button
						type="button"
						size="sm"
						variant={tab === "discussion" ? "secondary" : "ghost"}
						onClick={() => void setTab("discussion")}
					>
						Discussion
					</Button>
				) : null}
			</div>

			{tab === "analytics" ? (
				<PublicAnalyticsSection
					data={analyticsQuery.data}
					isLoading={analyticsQuery.isLoading}
					errorMessage={analyticsQuery.error?.message}
				/>
			) : null}

			{tab === "discussion" && topic.pack.status === "published" ? (
				<PackTopicDiscussionSection
					topicId={topic.id}
					sessionUserId={session?.user?.id}
					loginRedirect={`/packs/${packSlug}/topics/${topic.slug}/?tab=discussion`}
				/>
			) : null}

			{tab === "content" ? (
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
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											QDR{" "}
											{formatDifficultyDr(
												question.qdr,
												question.qdrScoredAttempts > 0,
											)}
										</span>
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
			) : null}
		</PacksSubpageContainer>
	);
}
