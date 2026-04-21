import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Alert, AlertDescription } from "@xamsa/ui/components/alert";
import { Button } from "@xamsa/ui/components/button";
import { Rating } from "@xamsa/ui/components/rating";
import { MIN_TOPICS_PER_PACK_TO_PUBLISH } from "@xamsa/utils/constants";
import { format } from "date-fns";
import { ArchiveIcon, GlobeIcon, Play, Star, Trophy } from "lucide-react";
import { ChangePackStatusDrawer } from "@/components/change-pack-status-drawer";
import { PackActionsMenu } from "@/components/pack-actions-menu";
import { PackHeaderChips } from "@/components/pack-header-chips";
import { PackNotFound } from "@/components/pack-not-found";
import { PackTopicsList } from "@/components/pack-topics-list";
import { RatePackDialog } from "@/components/rate-pack-dialog";
import { StatCard } from "@/components/stat-card";
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
	head: ({ loaderData }) => ({
		meta: [
			{ title: loaderData ? `${loaderData.name} — Xamsa` : "Pack — Xamsa" },
			{
				name: "description",
				content: loaderData?.description || "A pack of questions and answers",
			},
			{
				name: "og:title",
				content: loaderData
					? `${loaderData.name} by ${loaderData.author.name} — Xamsa`
					: "Pack — Xamsa",
			},
			{
				name: "og:description",
				content: loaderData?.description || "A pack of questions and answers",
			},
		],
	}),
});

function RouteComponent() {
	const pack = Route.useLoaderData();

	const hasRatings = pack.totalRatings > 0;
	const topicCount = pack._count.topics;
	const canPublish = topicCount >= MIN_TOPICS_PER_PACK_TO_PUBLISH;

	function StatusChangeButton() {
		if (!pack.isAuthor) return null;

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
		<div className="container mx-auto max-w-3xl space-y-6 py-10">
			<div className="space-y-3">
				<PackHeaderChips
					language={pack.language}
					status={pack.status}
					visibility={pack.visibility}
					totalTopics={pack._count.topics}
				/>

				<div className="flex items-center justify-between gap-2">
					<h1 className="font-bold text-3xl tracking-tight">{pack.name}</h1>
					{pack.isAuthor ? (
						<div className="flex items-center gap-2">
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
							className="flex items-center gap-2"
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

			<div className="grid grid-cols-2 gap-3">
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
			</div>

			{pack.isAuthor && pack.status === "published" && (
				<Button
					size="lg"
					className="w-full"
					render={<Link to="/play" search={{ pack: pack.slug }} />}
				>
					<Trophy />
					Play this pack
				</Button>
			)}

			{pack.isAuthor && pack.status === "draft" && !canPublish && (
				<Alert variant="info">
					<AlertDescription>
						You need at least {MIN_TOPICS_PER_PACK_TO_PUBLISH} topics to publish
						this pack. Currently you have {topicCount}.
					</AlertDescription>
				</Alert>
			)}

			<PackTopicsList packSlug={pack.slug} isAuthor={pack.isAuthor} />
		</div>
	);
}
