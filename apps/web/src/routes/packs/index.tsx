import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { packSort } from "@xamsa/schemas/modules/listings/pack";
import { Button } from "@xamsa/ui/components/button";
import { Spinner } from "@xamsa/ui/components/spinner";
import { PlusIcon } from "lucide-react";
import {
	parseAsBoolean,
	parseAsFloat,
	parseAsInteger,
	useQueryState,
} from "nuqs";
import { useEffect, useRef } from "react";
import { PackCard } from "@/components/pack-card";
import { PackFilters } from "@/components/pack-filters";
import { SearchBar } from "@/components/search-bar";
import { getUser } from "@/functions/get-user";
import { useSearchQuery } from "@/hooks/use-search-query";
import { useSortQuery } from "@/hooks/use-sort-query";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		return context.session;
	},
});

function RouteComponent() {
	const session = Route.useLoaderData();

	const [, query] = useSearchQuery();
	const [limit] = useQueryState("limit", parseAsInteger.withDefault(10));
	const { sort, dir } = useSortQuery(packSort.options, packSort.defaultOption);

	const [minAverageRating] = useQueryState(
		"min_average_rating",
		parseAsFloat.withDefault(0),
	);
	const [minPlays] = useQueryState("min_plays", parseAsInteger.withDefault(0));
	const [hasRatings] = useQueryState(
		"has_ratings",
		parseAsBoolean.withDefault(false),
	);
	const [onlyMyPacks] = useQueryState(
		"only_my_packs",
		parseAsBoolean.withDefault(false),
	);

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isError,
		error,
	} = useInfiniteQuery({
		...orpc.pack.list.infiniteOptions({
			input: (pageParam: string | undefined) => ({
				cursor: pageParam,
				query,
				limit,
				sort,
				dir,
				minAverageRating,
				minPlays,
				hasRatings,
				onlyMyPacks: !session ? undefined : onlyMyPacks,
			}),
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		}),
	});

	const packs = data?.pages.flatMap((page) => page.items) ?? [];
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!sentinelRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0 },
		);

		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return (
		<div className="container mx-auto max-w-7xl space-y-6 py-10">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl">List of packs</h1>
				<Button render={<Link to="/packs/new" />}>
					<PlusIcon />
					Create pack
				</Button>
			</div>
			<SearchBar
				placeholder="Search packs..."
				containerClassName="mx-auto max-w-xl"
			/>
			<PackFilters isAuthenticated={!!session} />

			{isLoading ? (
				<div className="flex justify-center py-12">
					<Spinner />
				</div>
			) : isError ? (
				<p className="text-center text-destructive-foreground">
					{error.message || "Failed to load packs"}
				</p>
			) : packs.length === 0 ? (
				<p className="text-center text-muted-foreground">No packs found</p>
			) : (
				<div className="grid gap-4 sm:grid-cols-2">
					{packs.map((pack) => (
						<PackCard key={pack.slug} pack={pack} />
					))}
				</div>
			)}

			{/* Sentinel — triggers next page when scrolled into view */}
			<div ref={sentinelRef} className="h-1" />

			{isFetchingNextPage && (
				<div className="flex justify-center py-4">
					<Spinner />
				</div>
			)}

			{!hasNextPage && packs.length > 0 && (
				<p className="text-center text-muted-foreground text-sm">
					No more packs to load
				</p>
			)}
		</div>
	);
}
