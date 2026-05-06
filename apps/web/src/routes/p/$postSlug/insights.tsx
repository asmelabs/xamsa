import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	redirect,
} from "@tanstack/react-router";
import {
	Card,
	CardDescription,
	CardHeader,
	CardPanel,
	CardTitle,
} from "@xamsa/ui/components/card";
import { Spinner } from "@xamsa/ui/components/spinner";
import { ChevronLeft } from "lucide-react";
import { PostCard } from "@/components/home/home-feed";
import { PostInsightsView } from "@/components/post-insights/post-insights-view";
import { getUser } from "@/functions/get-user";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/p/$postSlug/insights")({
	beforeLoad: async () => {
		const session = await getUser();
		if (!session) {
			throw redirect({ to: "/auth/login" });
		}
		return { session };
	},
	loader: async ({ params, context }) => {
		try {
			const post = await orpc.post.findOne.call({
				slug: params.postSlug,
			});
			if (!context.session || post.author.id !== context.session.user.id) {
				throw notFound();
			}
			return { post, viewerUserId: context.session.user.id };
		} catch (err) {
			if (err && typeof err === "object" && "isNotFound" in err) throw err;
			throw notFound();
		}
	},
	head: ({ loaderData }) => {
		const who =
			loaderData?.post.author.name ??
			loaderData?.post.author.username ??
			"post";
		return pageSeo({
			title: `Insights · ${who}`,
			description: `Analytics for ${who}'s post on Xamsa.`,
			path: loaderData ? `/p/${loaderData.post.slug}/insights/` : undefined,
			noIndex: true,
		});
	},
	component: InsightsPage,
});

function InsightsPage() {
	const { post, viewerUserId } = Route.useLoaderData();

	const { data, isPending, error } = useQuery({
		...orpc.post.getInsights.queryOptions({ input: { slug: post.slug } }),
	});

	return (
		<div className="relative min-h-svh overflow-x-hidden">
			<div className="pointer-events-none fixed inset-0 -z-10">
				<div className="absolute inset-0 bg-linear-to-b from-muted/40 via-background to-background" />
			</div>
			<div className="relative mx-auto w-full max-w-208 px-4 pt-6 pb-20 sm:px-6 sm:pt-10 sm:pb-28">
				<nav className="mb-6 flex items-center justify-between">
					<Link
						to="/p/$postSlug"
						params={{ postSlug: post.slug }}
						className="inline-flex items-center gap-2 text-muted-foreground text-sm tracking-tight transition-colors hover:text-foreground"
					>
						<ChevronLeft aria-hidden className="size-4 shrink-0" />
						Back to post
					</Link>
				</nav>
				<header className="mb-6 space-y-1">
					<p className="text-muted-foreground text-xs uppercase tracking-wider">
						Insights
					</p>
					<h1 className="font-semibold text-2xl tracking-tight">
						How this post landed
					</h1>
					<p className="text-muted-foreground text-sm">
						Only you can see this page.
					</p>
				</header>

				<div className="mb-6">
					<PostCard post={post} sessionUserId={viewerUserId} />
				</div>

				{isPending ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : error ? (
					<Card>
						<CardHeader>
							<CardTitle>Couldn't load insights</CardTitle>
							<CardDescription>{error.message}</CardDescription>
						</CardHeader>
						<CardPanel />
					</Card>
				) : data ? (
					<PostInsightsView data={data} />
				) : null}
			</div>
		</div>
	);
}
