import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeIdSchema } from "@xamsa/schemas/modules/badge";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@xamsa/ui/components/avatar";
import { Button } from "@xamsa/ui/components/button";
import { getBadge } from "@xamsa/utils/badges";
import { format } from "date-fns";
import { LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/badges/$badgeId/awards/$awardId")({
	component: RouteComponent,
	loader: async ({ params, context }) => {
		const parsed = BadgeIdSchema.safeParse(params.badgeId);
		if (!parsed.success) throw notFound();
		try {
			const award = await context.queryClient.ensureQueryData(
				orpc.badge.findAward.queryOptions({
					input: { awardId: params.awardId },
				}),
			);
			if (award.badgeId !== parsed.data) throw notFound();
			return { badgeId: parsed.data, award, meta: getBadge(parsed.data) };
		} catch {
			throw notFound();
		}
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Badge award",
				description: "A Xamsa achievement badge earned in a live game.",
				path: "/badges/",
			});
		}
		const { meta, award, badgeId } = loaderData;
		const displayName = award.user.name?.trim() || award.user.username;
		const title = `${displayName} earned “${meta.name}”`;
		const desc = `${meta.name}: ${meta.description}`;
		const path = `/badges/${badgeId}/awards/${award.id}/`;
		return pageSeo({
			title,
			description: desc,
			path,
			ogTitle: title,
			ogDescription: desc,
			ogImagePath: `/api/og/badges/${badgeId}/awards/${award.id}/og.png`,
			keywords: `Xamsa, badge, ${meta.name}, ${displayName}, achievement`,
		});
	},
});

function RouteComponent() {
	const { badgeId, meta, award } = Route.useLoaderData();
	const { copy } = useCopyToClipboard();
	const earnedAt = new Date(award.earnedAt);
	const displayName = award.user.name?.trim() || award.user.username;

	const { data: refreshed } = useQuery(
		orpc.badge.findAward.queryOptions({ input: { awardId: award.id } }),
	);
	const view = refreshed ?? award;

	const handleCopyLink = () => {
		copy(`${window.location.origin}/badges/${badgeId}/awards/${view.id}`);
		toast.success("Share link copied");
	};

	return (
		<div className="container mx-auto max-w-2xl space-y-8 px-4 py-8">
			<Link
				className="text-muted-foreground text-sm hover:underline"
				to="/badges/$badgeId"
				params={{ badgeId }}
			>
				← Back to {meta.name}
			</Link>

			<section className="rounded-2xl border border-border bg-gradient-to-br from-primary/8 via-card to-card p-6 sm:p-8">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
					<span className="text-6xl leading-none" aria-hidden>
						{meta.icon}
					</span>
					<div className="min-w-0 space-y-2">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
							Badge earned
						</p>
						<h1 className="font-bold text-2xl tracking-tight sm:text-3xl">
							{displayName} earned “{meta.name}”
						</h1>
						<p className="text-muted-foreground text-sm sm:text-base">
							{meta.description}
						</p>
					</div>
				</div>

				<div className="mt-6 flex flex-wrap items-center gap-3 border-border border-t pt-4 text-sm">
					<Link
						to="/u/$username"
						params={{ username: view.user.username }}
						className="flex items-center gap-2 hover:underline"
					>
						<Avatar className="size-7">
							<AvatarImage src={view.user.image ?? undefined} />
							<AvatarFallback>
								{displayName.slice(0, 1).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span className="font-medium">@{view.user.username}</span>
					</Link>
					<span className="text-muted-foreground">·</span>
					<Link
						to="/g/$code"
						params={{ code: view.game.code }}
						className="hover:underline"
					>
						{view.game.pack.name} · {view.game.code}
					</Link>
					{view.topic ? (
						<>
							<span className="text-muted-foreground">·</span>
							<span className="text-muted-foreground">
								Topic {view.topic.order}: {view.topic.name}
								{view.questionOrder != null ? ` · Q${view.questionOrder}` : ""}
							</span>
						</>
					) : null}
					<span className="text-muted-foreground">·</span>
					<span className="text-muted-foreground">
						{format(earnedAt, "PPp")}
					</span>
				</div>

				<div className="mt-6 flex flex-wrap gap-2">
					<Button onClick={handleCopyLink} size="sm" variant="outline">
						<LinkIcon />
						Copy share link
					</Button>
					<Link
						to="/badges/$badgeId"
						params={{ badgeId }}
						className="inline-flex h-8 items-center rounded-md px-3 text-muted-foreground text-sm hover:text-foreground"
					>
						See all earners →
					</Link>
				</div>
			</section>

			<section className="space-y-2">
				<h2 className="font-semibold">How it's earned</h2>
				<ul className="list-inside list-disc text-muted-foreground text-sm">
					{meta.requirements.map((r) => (
						<li key={r}>{r}</li>
					))}
				</ul>
			</section>
		</div>
	);
}
