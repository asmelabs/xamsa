import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { GetPaginatedItem } from "@xamsa/schemas/common/pagination";
import type { ListTopicsOutputType } from "@xamsa/schemas/modules/topic";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import { Button } from "@xamsa/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@xamsa/ui/components/empty";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Spinner } from "@xamsa/ui/components/spinner";
import { QUESTIONS_PER_TOPIC } from "@xamsa/utils/constants";
import {
	ChevronLeftIcon,
	ChevronRight,
	ChevronRightIcon,
	InboxIcon,
	PlusIcon,
} from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect } from "react";
import { orpc } from "@/utils/orpc";

type PackTopicsListBase = "pack" | "topicsPage";

interface PackTopicsListProps {
	packSlug: string;
	isAuthor: boolean;
	limit?: number;
	/** Use `topicsPage` when this list is embedded on `/packs/.../topics` so pagination matches the URL. */
	listBase?: PackTopicsListBase;
}

export function PackTopicsList({
	packSlug,
	isAuthor,
	limit = 10,
	listBase = "pack",
}: PackTopicsListProps) {
	const listTo =
		listBase === "topicsPage" ? "/packs/$packSlug/topics" : "/packs/$packSlug";
	const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

	const {
		data: topics,
		isLoading,
		error,
	} = useQuery({
		...orpc.topic.list.queryOptions({
			input: {
				packs: [packSlug],
				page,
				limit,
			},
		}),
		enabled: !!packSlug,
		retry: false,
	});

	useEffect(() => {
		if (!topics?.metadata) return;
		const { totalPages } = topics.metadata;

		if (page > 1 && page > totalPages) {
			setPage(totalPages > 0 ? totalPages : null);
		}
	}, [topics?.metadata, page, setPage]);

	const pagination = topics?.metadata;
	const hasPagination =
		pagination &&
		(pagination.prevPage !== null || pagination.nextPage !== null);

	return (
		<Frame>
			<FrameHeader className="flex items-center justify-between">
				<FrameTitle>
					Topics
					{pagination && pagination.total > 0 && (
						<span className="ml-1.5 font-normal text-muted-foreground text-sm">
							({pagination.total})
						</span>
					)}
				</FrameTitle>
				{pagination && pagination.totalPages > 1 && (
					<span className="text-muted-foreground text-xs">
						Page {pagination.page} of {pagination.totalPages}
					</span>
				)}
			</FrameHeader>

			<FramePanel>
				{isLoading ? (
					<div className="flex justify-center py-12">
						<Spinner />
					</div>
				) : error ? (
					<Alert variant="error">
						<AlertTitle>Failed to load topics</AlertTitle>
						<AlertDescription>
							Something went wrong. Please try refreshing the page.
						</AlertDescription>
					</Alert>
				) : topics?.items.length === 0 ? (
					<Empty className="py-10 md:py-12">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<InboxIcon />
							</EmptyMedia>
							<EmptyTitle>No topics yet</EmptyTitle>
							<EmptyDescription>
								This pack doesn't have any topics. Topics will appear here once
								they're added.
							</EmptyDescription>
						</EmptyHeader>
						{isAuthor && (
							<Button
								variant="outline"
								render={
									<Link
										to="/packs/$packSlug/topics/new"
										params={{ packSlug }}
									/>
								}
							>
								<PlusIcon />
								Add first topic
							</Button>
						)}
					</Empty>
				) : (
					<div className="space-y-2">
						{topics?.items.map((topic) => (
							<TopicCard key={topic.slug} packSlug={packSlug} topic={topic} />
						))}
					</div>
				)}
			</FramePanel>

			{hasPagination && (
				<FrameFooter>
					<div className="flex items-center justify-between">
						{pagination.prevPage !== null ? (
							<Button
								variant="outline"
								size="sm"
								render={
									<Link
										to={listTo}
										params={{ packSlug }}
										search={{ page: pagination.prevPage }}
									/>
								}
							>
								<ChevronLeftIcon />
								Previous
							</Button>
						) : (
							<div />
						)}
						{pagination.nextPage !== null ? (
							<Button
								variant="outline"
								size="sm"
								render={
									<Link
										to={listTo}
										params={{ packSlug }}
										search={{ page: pagination.nextPage }}
									/>
								}
							>
								Next
								<ChevronRightIcon />
							</Button>
						) : (
							<div />
						)}
					</div>
				</FrameFooter>
			)}
		</Frame>
	);
}

function TopicCard({
	topic,
	packSlug,
}: {
	topic: GetPaginatedItem<ListTopicsOutputType>;
	packSlug: string;
}) {
	const q = topic._count.questions;
	return (
		<Link
			to="/packs/$packSlug/topics/$topicSlug"
			params={{ packSlug, topicSlug: topic.slug }}
			className="group flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/30 hover:bg-primary/3"
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground text-sm transition-colors group-hover:bg-primary/10 group-hover:text-primary">
				{topic.order}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="min-w-0 truncate font-medium text-sm">{topic.name}</h3>
					<span className="shrink-0 rounded-md border border-border/80 bg-muted/40 px-1.5 py-0 text-[11px] text-muted-foreground leading-none">
						{String(q)}/{String(QUESTIONS_PER_TOPIC)} Q
					</span>
				</div>
				{topic.description && (
					<p className="mt-0.5 truncate text-muted-foreground text-xs">
						{topic.description}
					</p>
				)}
			</div>
			<ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
		</Link>
	);
}
