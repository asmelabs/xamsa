import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@xamsa/ui/components/alert";
import { Button } from "@xamsa/ui/components/button";
import { Rating } from "@xamsa/ui/components/rating";
import {
	Tooltip,
	TooltipPopup,
	TooltipTrigger,
} from "@xamsa/ui/components/tooltip";
import { MIN_TOPICS_PER_PACK_TO_PUBLISH } from "@xamsa/utils/constants";
import { format } from "date-fns";
import {
	ArchiveIcon,
	BarChart2,
	GlobeIcon,
	Play,
	Star,
	Trophy,
} from "lucide-react";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { ChangePackStatusDrawer } from "@/components/change-pack-status-drawer";
import { PackActionsMenu } from "@/components/pack-actions-menu";
import { PackHeaderChips } from "@/components/pack-header-chips";
import { PackNotFound } from "@/components/pack-not-found";
import { PackTopicDiscussionSection } from "@/components/pack-topic-discussion-section";
import { PackTopicsList } from "@/components/pack-topics-list";
import { PacksSubpageContainer } from "@/components/packs";
import { PublicAnalyticsSection } from "@/components/public-analytics-section";
import { RatePackDialog } from "@/components/rate-pack-dialog";
import { StatCard } from "@/components/stat-card";
import { authClient } from "@/lib/auth-client";
import { formatDifficultyDr } from "@/lib/difficulty-display";
import { packPageJsonLd } from "@/lib/json-ld";
import { pageSeo, truncateMeta } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/$packSlug/")({
	component: RouteComponent,
	notFoundComponent: PackNotFound,

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
				title: "Pack",
				description:
					"Question pack on Xamsa — topics, questions, and live play.",
			});
		}
		const desc =
			loaderData.description?.trim() ||
			`“${loaderData.name}” by ${loaderData.author.name}: a Xamsa question pack you can browse, rate, and use in live buzzer games.`;
		return pageSeo({
			title: loaderData.name,
			description: desc,
			path: `/packs/${loaderData.slug}/`,
			ogType: "article",
			ogTitle: `${loaderData.name} · ${loaderData.author.name}`,
			ogDescription: truncateMeta(desc),
			ogImagePath: `/api/og/pack/${loaderData.slug}/og.png`,
			keywords: `${loaderData.name}, quiz pack, Xamsa, ${loaderData.author.username}, trivia, ${loaderData.language ?? "quiz"}`,
			jsonLd: packPageJsonLd(loaderData),
		});
	},
});

function RouteComponent() {
	const pack = Route.useLoaderData();
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
		orpc.pack.getAnalytics.queryOptions({ input: { slug: pack.slug } }),
	);

	const hasRatings = pack.totalRatings > 0;
	const canHostPublishedGame =
		pack.status === "published" &&
		(pack.isAuthor ||
			(pack.allowOthersHost === true && pack.visibility === "public"));
	const showPlayToHost = !!session?.user && canHostPublishedGame;
	const topicCount = pack._count.topics;
	const canPublish = topicCount >= MIN_TOPICS_PER_PACK_TO_PUBLISH;

	function StatusChangeButton() {
		if (!pack.isAuthor) return null;

		if (pack.status === "draft" && !canPublish) {
			const needed = Math.max(0, MIN_TOPICS_PER_PACK_TO_PUBLISH - topicCount);
			return (
				<Tooltip>
					<TooltipTrigger
						render={
							<span className="inline-flex">
								<Button
									aria-label={`Cannot publish until you have at least ${String(MIN_TOPICS_PER_PACK_TO_PUBLISH)} topics. You have ${String(topicCount)}.`}
									disabled
									size="sm"
									type="button"
									variant="outline"
								>
									<GlobeIcon />
									Publish
								</Button>
							</span>
						}
					/>
					<TooltipPopup className="max-w-xs" side="bottom">
						Add {String(needed)} more topic{needed === 1 ? "" : "s"} to publish
						(minimum {String(MIN_TOPICS_PER_PACK_TO_PUBLISH)}). You have{" "}
						{String(topicCount)}.
					</TooltipPopup>
				</Tooltip>
			);
		}

		if (pack.status === "draft" && canPublish) {
			return (
				<ChangePackStatusDrawer slug={pack.slug} status="published">
					<Button variant="outline" size="sm">
						<GlobeIcon />
						Publish
					</Button>
				</ChangePackStatusDrawer>
			);
		}

		if (pack.status === "published") {
			return (
				<ChangePackStatusDrawer slug={pack.slug} status="archived">
					<Button variant="outline" size="sm">
						<ArchiveIcon />
						Archive
					</Button>
				</ChangePackStatusDrawer>
			);
		}

		if (pack.status === "archived") {
			return (
				<ChangePackStatusDrawer slug={pack.slug} status="published">
					<Button variant="outline" size="sm">
						<GlobeIcon />
						Republish
					</Button>
				</ChangePackStatusDrawer>
			);
		}

		return null;
	}

	return (
		<PacksSubpageContainer className="space-y-6" variant="narrow">
			<div
				className={
					pack.isAuthor
						? "space-y-3 rounded-2xl border border-border/80 bg-card/40 p-5 shadow-sm/5"
						: "space-y-3"
				}
			>
				<PackHeaderChips
					language={pack.language}
					status={pack.status}
					visibility={pack.visibility}
					totalTopics={pack._count.topics}
				/>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
					<div className="min-w-0 space-y-1.5">
						<h1 className="font-bold text-3xl tracking-tight">{pack.name}</h1>
						{pack.isAuthor && (
							<p className="text-muted-foreground text-sm">
								Manage topics, questions, and publication from this page.
							</p>
						)}
						{!pack.isAuthor &&
							pack.rating === undefined &&
							pack.status === "published" && (
								<p className="text-muted-foreground text-sm">
									One quick score helps the author and the community. Use{" "}
									<span className="font-medium text-foreground">
										Rate this pack
									</span>{" "}
									when you are ready.
								</p>
							)}
					</div>
					{pack.isAuthor ? (
						<div className="flex shrink-0 items-center gap-2 self-start">
							<StatusChangeButton />
							<PackActionsMenu
								packSlug={pack.slug}
								packName={pack.name}
								visibility={pack.visibility}
								status={pack.status}
							/>
						</div>
					) : pack.rating === undefined ? (
						<RatePackDialog packSlug={pack.slug} />
					) : pack.rating ? (
						<div
							className="flex shrink-0 items-center gap-2"
							title={`You have rated this pack ${pack.rating.toFixed(1)} out of 5`}
						>
							<Rating size={14} value={pack.rating} readOnly />
							<span className="sr-only">Rated {pack.rating.toFixed(1)}</span>
						</div>
					) : null}
				</div>

				{pack.description && (
					<p className="text-muted-foreground">{pack.description}</p>
				)}

				<p className="text-muted-foreground text-sm">
					by{" "}
					<Link
						to="/u/$username"
						params={{ username: pack.author.username }}
						className="font-medium text-foreground hover:underline"
					>
						{pack.author.name}
					</Link>
					<span className="mx-1.5">·</span>
					{pack.publishedAt ? format(pack.publishedAt, "dd MMMM yyyy") : "—"}
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<StatCard
					icon={<Play className="size-4" />}
					label="Plays"
					sub={"Total completed plays"}
					value={pack.totalPlays.toLocaleString()}
				/>
				<StatCard
					icon={<Star className="size-4" />}
					label="Rating"
					value={hasRatings ? pack.averageRating.toFixed(1) : "—"}
					sub={
						hasRatings
							? `Total ${pack.totalRatings} rating${pack.totalRatings === 1 ? "" : "s"}`
							: "No ratings yet"
					}
				/>
				<StatCard
					icon={<BarChart2 className="size-4" />}
					label="Pack difficulty (PDR)"
					sub="From live play"
					value={formatDifficultyDr(pack.pdr, pack.hasRatedDifficulty)}
				/>
			</div>

			{showPlayToHost && (
				<Button
					size="lg"
					className="w-full"
					render={
						<Link to="/play/new/$packSlug" params={{ packSlug: pack.slug }} />
					}
				>
					<Trophy />
					Play this pack
				</Button>
			)}

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
				{pack.status === "published" ? (
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

			{tab === "discussion" && pack.status === "published" ? (
				<PackTopicDiscussionSection
					packId={pack.id}
					sessionUserId={session?.user?.id}
					loginRedirect={`/packs/${pack.slug}/?tab=discussion`}
				/>
			) : null}

			{tab === "content" ? (
				<>
					{pack.isAuthor && pack.status === "draft" && !canPublish && (
						<Alert variant="info">
							<AlertDescription>
								You need at least {MIN_TOPICS_PER_PACK_TO_PUBLISH} topics to
								publish this pack. Currently you have {topicCount}.
							</AlertDescription>
						</Alert>
					)}

					<PackTopicsList
						isAuthor={pack.isAuthor}
						packSlug={pack.slug}
						packStatus={pack.status}
					/>
				</>
			) : null}
		</PacksSubpageContainer>
	);
}
