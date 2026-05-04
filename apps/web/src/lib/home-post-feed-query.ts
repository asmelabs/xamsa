import type { InfiniteData, Query, QueryClient } from "@tanstack/react-query";

import type {
	ListPostsFeedType,
	ListPostsOutputType,
} from "@xamsa/schemas/modules/post";

import { orpc } from "@/utils/orpc";

export const HOME_POST_FEED_LIMIT = 15;
export const PROFILE_POSTS_LIMIT = 15;

function baseHomeListInput(feed: ListPostsFeedType) {
	return { limit: HOME_POST_FEED_LIMIT, feed } as const;
}

/** Infinite `post.list` for the home timeline (everyone / following). */
export function homePostListInfiniteOptions(
	feed: ListPostsFeedType = "everyone",
) {
	const input = baseHomeListInput(feed);
	return orpc.post.list.infiniteOptions({
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last: ListPostsOutputType) =>
			last.metadata.nextCursor ?? undefined,
		input: (cursor: string | undefined) =>
			cursor ? { ...input, cursor } : input,
	});
}

function baseBookmarkInput() {
	return { limit: HOME_POST_FEED_LIMIT } as const;
}

/** Current user's saved posts (bookmark list). */
export function bookmarkedPostsInfiniteOptions() {
	const input = baseBookmarkInput();
	return orpc.post.listBookmarked.infiniteOptions({
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last: ListPostsOutputType) =>
			last.metadata.nextCursor ?? undefined,
		input: (cursor: string | undefined) =>
			cursor ? { ...input, cursor } : input,
	});
}

/** Public posts by username (profile Feed tab). */
export function profilePostsInfiniteOptions(username: string) {
	const input = {
		limit: PROFILE_POSTS_LIMIT,
		feed: "everyone" as const,
		authorUsername: username,
	};
	return orpc.post.list.infiniteOptions({
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last: ListPostsOutputType) =>
			last.metadata.nextCursor ?? undefined,
		input: (cursor: string | undefined) =>
			cursor ? { ...input, cursor } : input,
	});
}

/** Post rows cached by `post.list` or `post.listBookmarked` infinite queries */
function touchesPostRowInfiniteCache(query: Query): boolean {
	try {
		const s = JSON.stringify(query.queryKey);
		return (
			s.includes('"post"') &&
			(s.includes('"list"') || s.includes("listBookmarked"))
		);
	} catch {
		return false;
	}
}

/** Refetch timelines and bookmark lists that show full post rows */
export async function invalidateHomePostFeed(
	queryClient: QueryClient,
): Promise<void> {
	await queryClient.invalidateQueries({
		predicate: touchesPostRowInfiniteCache,
	});
}

/** Patch `totalComments` on matching post rows in infinite caches */
export function adjustPostTotalCommentsInHomeFeedCache(
	queryClient: QueryClient,
	postId: string,
	delta: number,
) {
	queryClient.setQueriesData<InfiniteData<ListPostsOutputType> | undefined>(
		{ predicate: touchesPostRowInfiniteCache },
		(old) => {
			if (old == null || !old.pages) return old;
			let touched = false;
			const pages = old.pages.map((page) => ({
				...page,
				items: page.items.map((row) => {
					if (row.id !== postId) return row;
					touched = true;
					return {
						...row,
						totalComments: Math.max(0, row.totalComments + delta),
					};
				}),
			}));
			return touched ? { ...old, pages } : old;
		},
	);
}

/** Remove a post everywhere it appears in infinite post-row caches */
export function removePostFromHomeFeedCache(
	queryClient: QueryClient,
	postId: string,
) {
	queryClient.setQueriesData<InfiniteData<ListPostsOutputType> | undefined>(
		{ predicate: touchesPostRowInfiniteCache },
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

/** Set `myBookmarked` locally on matching cached rows */
export function setPostBookmarkedInCaches(
	queryClient: QueryClient,
	postId: string,
	bookmarked: boolean,
) {
	queryClient.setQueriesData<InfiniteData<ListPostsOutputType> | undefined>(
		{ predicate: touchesPostRowInfiniteCache },
		(old) => {
			if (old == null || !old.pages) return old;
			let touched = false;
			const pages = old.pages.map((page) => ({
				...page,
				items: page.items.map((row) => {
					if (row.id !== postId) return row;
					touched = true;
					return { ...row, myBookmarked: bookmarked };
				}),
			}));
			return touched ? { ...old, pages } : old;
		},
	);
}
