import {
	createFileRoute,
	Link,
	notFound,
	Outlet,
	useMatch,
} from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PostCard } from "@/components/home/home-feed";
import { pageSeo, truncateMeta } from "@/lib/seo";
import { Route as RootRoute } from "@/routes/__root";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/p/$postSlug")({
	loader: async ({ params }) => {
		try {
			return await orpc.post.findOne.call({
				slug: params.postSlug,
			});
		} catch {
			throw notFound();
		}
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Post",
				description: "A post on the Xamsa home feed.",
			});
		}
		const who = loaderData.author.name ?? loaderData.author.username;
		const snippet =
			loaderData.body?.trim() ||
			(loaderData.image ? "Photo post" : "Post on Xamsa");
		const desc = truncateMeta(`${who}: ${snippet}`);
		return pageSeo({
			title: `${who} on Xamsa`,
			description: desc,
			path: `/p/${loaderData.slug}/`,
			ogType: "article",
			ogTitle: `${who}'s post`,
			ogDescription: desc,
			ogImagePath: `/api/og/post/${loaderData.slug}/og.png`,
			keywords: `Xamsa, post, ${loaderData.author.username}`,
		});
	},
	component: PostPage,
});

function PostPage() {
	// Call all hooks unconditionally before any early return so the hook count
	// stays stable when navigating between this route and its `/insights` child.
	const insightsMatch = useMatch({
		from: "/p/$postSlug/insights",
		shouldThrow: false,
	});
	const post = Route.useLoaderData();
	const { session } = RootRoute.useRouteContext();

	if (insightsMatch) {
		return <Outlet />;
	}

	return (
		<div className="relative min-h-svh overflow-x-hidden">
			<div className="pointer-events-none fixed inset-0 -z-10">
				<div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-background to-background" />
				<div className="absolute top-[-5rem] left-[8%] h-80 w-80 rounded-full bg-primary/[0.11] blur-[110px]" />
				<div className="absolute top-[42%] right-[2%] h-72 w-72 rounded-full bg-chart-3/22 blur-[100px]" />
			</div>
			<div className="relative mx-auto w-full max-w-[52rem] px-4 pt-6 pb-20 sm:px-6 sm:pt-10 sm:pb-28">
				<nav className="mb-8 font-medium">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-muted-foreground text-sm tracking-tight transition-colors hover:text-foreground"
					>
						<ChevronLeft aria-hidden className="size-4 shrink-0" />
						Back to feed
					</Link>
				</nav>
				<PostCard
					post={post}
					sessionUserId={session?.user?.id}
					commentsInitiallyOpen
				/>
			</div>
		</div>
	);
}
