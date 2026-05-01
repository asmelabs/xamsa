import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { ListPostsOutputType } from "@xamsa/schemas/modules/post";

import { orpc } from "@/utils/orpc";

export const HOME_POST_FEED_LIMIT = 15;

/** Shared infinite-query options for the home feed post list — use for prefetch, useInfiniteQuery, and invalidation. */
export function homePostListInfiniteOptions() {
	return orpc.post.list.infiniteOptions({
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last: ListPostsOutputType) =>
			last.metadata.nextCursor ?? undefined,
		input: (cursor: string | undefined) =>
			cursor
				? { cursor, limit: HOME_POST_FEED_LIMIT }
				: { limit: HOME_POST_FEED_LIMIT },
	});
}

/** Ensure all cached home-feed post lists refetch after mutations */
export async function invalidateHomePostFeed(
	queryClient: QueryClient,
): Promise<void> {
	const { queryKey } = homePostListInfiniteOptions();
	await queryClient.invalidateQueries({ queryKey });
}

/** Update `totalComments` for a single post everywhere it appears in the home feed infinite cache */
export function adjustPostTotalCommentsInHomeFeedCache(
	queryClient: QueryClient,
	postId: string,
	delta: number,
) {
	queryClient.setQueriesData<InfiniteData<ListPostsOutputType> | undefined>(
		{ queryKey: homePostListInfiniteOptions().queryKey },
		(old) => {
			if (old == null || !old.pages) return old;
			return {
				...old,
				pages: old.pages.map((page) => ({
					...page,
					items: page.items.map((row) =>
						row.id === postId
							? {
									...row,
									totalComments: Math.max(0, row.totalComments + delta),
								}
							: row,
					),
				})),
			};
		},
	);
}

/** Remove a post row from cached home-feed pages after delete */
export function removePostFromHomeFeedCache(
	queryClient: QueryClient,
	postId: string,
) {
	queryClient.setQueriesData<InfiniteData<ListPostsOutputType> | undefined>(
		{ queryKey: homePostListInfiniteOptions().queryKey },
		(old) => {
			if (old == null || !old.pages) return old;
			return {
				...old,
				pages: old.pages.map((page) => ({
					...page,
					items: page.items.filter((row) => row.id !== postId),
				})),
			};
		},
	);
}
