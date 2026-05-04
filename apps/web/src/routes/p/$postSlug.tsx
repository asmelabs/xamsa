import { createFileRoute, notFound } from "@tanstack/react-router";
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
	const post = Route.useLoaderData();
	const { session } = RootRoute.useRouteContext();

	return (
		<div className="mx-auto w-full max-w-xl px-4 py-8">
			<PostCard
				post={post}
				sessionUserId={session?.user?.id}
				commentsInitiallyOpen
			/>
		</div>
	);
}
