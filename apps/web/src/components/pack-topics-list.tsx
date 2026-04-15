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
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import {
	Pagination,
	PaginationNext,
	PaginationPrevious,
} from "@xamsa/ui/components/pagination";
import { Spinner } from "@xamsa/ui/components/spinner";
import { ChevronLeftIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useMemo } from "react";
import { orpc } from "@/utils/orpc";

interface PackTopicsListProps {
	packSlug: string;
}

export function PackTopicsList({ packSlug }: PackTopicsListProps) {
	const [page] = useQueryState("page", parseAsInteger.withDefault(1));

	const {
		data: topics,
		isLoading,
		error,
	} = useQuery({
		...orpc.topic.list.queryOptions({
			input: {
				packs: [packSlug],
				page,
				limit: 10,
			},
		}),
		enabled: !!packSlug,
		retry: false,
	});

	const pagination = useMemo(() => topics?.metadata, [topics]);

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Topics of this pack</FrameTitle>
			</FrameHeader>
			<FramePanel>
				{isLoading ? (
					<Spinner className="mx-auto" />
				) : error ? (
					<Alert>
						<AlertTitle>Error occured</AlertTitle>
						<AlertDescription>
							An unknown error occurred while fetching topics of this pack.
						</AlertDescription>
					</Alert>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{topics?.items.map((topic) => (
							<TopicCard key={topic.slug} topic={topic} />
						))}
					</div>
				)}
			</FramePanel>
			{pagination && (
				<FrameFooter>
					<Pagination className="justify-end gap-2">
						{pagination.prevPage !== null && (
							<PaginationPrevious
								render={
									<Button
										variant="outline"
										render={
											<Link
												to={"/packs/$packSlug"}
												params={{ packSlug }}
												search={{
													page: pagination.prevPage,
												}}
											/>
										}
									>
										<ChevronLeftIcon />
										Previous
									</Button>
								}
							/>
						)}
						{pagination.nextPage !== null && (
							<PaginationNext
								render={
									<Button
										variant="outline"
										render={
											<Link
												to={"/packs/$packSlug"}
												params={{ packSlug }}
												search={{ page: pagination.nextPage }}
											/>
										}
									/>
								}
							/>
						)}
					</Pagination>
				</FrameFooter>
			)}
		</Frame>
	);
}

function TopicCard({
	topic,
}: {
	topic: GetPaginatedItem<ListTopicsOutputType>;
}) {
	return (
		<div className="rounded-xl border border-border p-4">
			<h3 className="font-semibold text-lg">
				#{topic.order}. {topic.name}
			</h3>
			{topic.description && (
				<p className="text-muted-foreground text-sm">
					{topic.description.length > 100
						? `${topic.description.slice(0, 100)}...`
						: topic.description}
				</p>
			)}
		</div>
	);
}
