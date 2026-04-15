import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import { format } from "date-fns";
import {
	ArchiveIcon,
	GlobeIcon,
	Play,
	PlayIcon,
	Star,
	StarIcon,
	Trophy,
} from "lucide-react";
import { useMemo } from "react";
import { ChangePackStatusDrawer } from "@/components/change-pack-status-drawer";
import { PackActionsMenu } from "@/components/pack-actions-menu";
import { PackHeaderChips } from "@/components/pack-header-chips";
import { PackNotFound } from "@/components/pack-not-found";
import { PackTopicsList } from "@/components/pack-topics-list";
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

const statusConfig = {
	draft: { label: "Draft", variant: "outline" },
	published: { label: "Published", variant: "success" },
	archived: { label: "Archived", variant: "info" },
} as const;

function RouteComponent() {
	const pack = Route.useLoaderData();

	const status = statusConfig[pack.status];
	const hasRatings = pack.totalRatings > 0;

	const statusAction = useMemo(() => {
		if (!pack.isAuthor) return null;
		if (pack.status === "draft")
			return (
				<ChangePackStatusDrawer slug={pack.slug} status="published">
					<Button size="lg" className="w-full">
						<GlobeIcon />
						Publish this pack
					</Button>
				</ChangePackStatusDrawer>
			);
		if (pack.status === "published")
			return (
				<>
					<Button
						size="lg"
						className="w-full"
						render={<Link to="/play" search={{ pack: pack.slug }} />}
					>
						<Trophy />
						Play this pack
					</Button>
					<ChangePackStatusDrawer slug={pack.slug} status="archived">
						<Button size="lg" variant="outline" className="w-full">
							<ArchiveIcon />
							Archive this pack
						</Button>
					</ChangePackStatusDrawer>
				</>
			);
		if (pack.status === "archived")
			return (
				<ChangePackStatusDrawer slug={pack.slug} status="published">
					<Button size="lg" className="w-full">
						<GlobeIcon />
						Republish this pack
					</Button>
				</ChangePackStatusDrawer>
			);
		return null;
	}, [pack.isAuthor, pack.status, pack.slug]);

	return (
		<div className="container mx-auto max-w-3xl space-y-6 py-10">
			<div className="space-y-3">
				<PackHeaderChips
					visibility={pack.visibility}
					language={pack.language}
					totalTopics={pack._count.topics}
					variant={status.variant}
					label={status.label}
				/>

				<div className="flex items-center justify-between gap-2">
					<h1 className="font-bold text-3xl tracking-tight">{pack.name}</h1>
					{pack.isAuthor ? (
						<div className="flex items-center gap-2">
							{pack.status === "published" && (
								<Button
									render={<Link to="/play" search={{ pack: pack.slug }} />}
								>
									<PlayIcon />
									Play
								</Button>
							)}
							<PackActionsMenu
								packSlug={pack.slug}
								visibility={pack.visibility}
								status={pack.status}
							/>
						</div>
					) : (
						<Button variant="outline" size="icon">
							<StarIcon />
						</Button>
					)}
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
					{format(pack.createdAt, "dd MMMM yyyy")}
				</p>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<StatCard
					icon={<Play className="size-4" />}
					label="Plays"
					value={pack.totalPlays.toLocaleString()}
				/>
				<StatCard
					icon={<Star className="size-4" />}
					label="Rating"
					value={hasRatings ? pack.averageRating.toFixed(1) : "—"}
					sub={hasRatings ? `${pack.totalRatings} ratings` : "No ratings yet"}
				/>
			</div>

			{statusAction}

			<PackTopicsList packSlug={pack.slug} />
		</div>
	);
}
