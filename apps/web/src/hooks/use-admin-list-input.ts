import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { useSearchQuery } from "@/hooks/use-search-query";
import { useSortQuery } from "@/hooks/use-sort-query";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 25;

/**
 * URL-driven pagination + sort + search for admin list pages (offset pagination on the server).
 */
export function useAdminListInput<const T extends string[]>(
	sortOptions: T,
	defaultSort: T[number],
) {
	const [page, setPage] = useQueryState(
		"page",
		parseAsInteger.withDefault(DEFAULT_PAGE),
	);
	const [limit, setLimit] = useQueryState(
		"limit",
		parseAsInteger.withDefault(DEFAULT_LIMIT),
	);
	const { sort, dir, setSort, setDir } = useSortQuery(sortOptions, defaultSort);
	const [, queryDebounced] = useSearchQuery();
	const lastQuery = useRef(queryDebounced);
	useEffect(() => {
		if (lastQuery.current !== queryDebounced) {
			lastQuery.current = queryDebounced;
			void setPage(1);
		}
	}, [queryDebounced, setPage]);

	const prevLimit = useRef(limit);
	useEffect(() => {
		if (prevLimit.current !== limit) {
			prevLimit.current = limit;
			void setPage(1);
		}
	}, [limit, setPage]);

	const sortKey = `${sort}:${dir}`;
	const prevSortKey = useRef(sortKey);
	useEffect(() => {
		if (prevSortKey.current !== sortKey) {
			prevSortKey.current = sortKey;
			void setPage(1);
		}
	}, [sortKey, setPage]);

	return {
		input: {
			page,
			limit,
			sort: sort as T[number],
			dir,
			query: queryDebounced?.trim() || undefined,
		},
		page,
		setPage,
		limit,
		setLimit,
		sort: sort as T[number],
		setSort,
		dir,
		setDir,
	};
}
