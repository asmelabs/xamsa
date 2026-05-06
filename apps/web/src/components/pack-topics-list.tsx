import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { GetPaginatedItem } from "@xamsa/schemas/common/pagination";
import type { ListTopicsOutputType } from "@xamsa/schemas/modules/topic";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@xamsa/ui/components/alert";
import { Button } from "@xamsa/ui/components/button";
import { Checkbox } from "@xamsa/ui/components/checkbox";
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
	ListChecksIcon,
	PencilIcon,
	PlusIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BetterDialog } from "@/components/better-dialog";
import { DeleteTopicDialog } from "@/components/delete-topic-dialog";
import { formatDifficultyDr } from "@/lib/difficulty-display";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";

type PackTopicsListBase = "pack" | "topicsPage";

interface PackTopicsListProps {
	packSlug: string;
	isAuthor: boolean;
	/** When `draft` and `isAuthor`, each topic can be deleted. */
	packStatus?: "draft" | "published" | "archived";
	limit?: number;
	/** Use `topicsPage` when this list is embedded on `/packs/.../topics` so pagination matches the URL. */
	listBase?: PackTopicsListBase;
}

export function PackTopicsList({
	packSlug,
	isAuthor,
	packStatus,
	limit = 10,
	listBase = "pack",
}: PackTopicsListProps) {
	const canMutateTopics = isAuthor && packStatus === "draft";
	const listTo =
		listBase === "topicsPage" ? "/packs/$packSlug/topics" : "/packs/$packSlug";
	const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
	const queryClient = useQueryClient();

	const [selectMode, setSelectMode] = useState(false);
	const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

	const visibleTopics = topics?.items ?? [];
	const visibleSlugs = useMemo(
		() => visibleTopics.map((t) => t.slug),
		[visibleTopics],
	);
	const visibleSelectedCount = visibleSlugs.filter((slug) =>
		selectedSlugs.has(slug),
	).length;
	const allVisibleSelected =
		visibleSlugs.length > 0 && visibleSelectedCount === visibleSlugs.length;
	const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
	const selectedTopics = visibleTopics.filter((t) => selectedSlugs.has(t.slug));

	const exitSelectMode = () => {
		setSelectMode(false);
		setSelectedSlugs(new Set());
	};

	const toggleSelectMode = () => {
		if (selectMode) {
			exitSelectMode();
		} else {
			setSelectMode(true);
		}
	};

	const toggleSlug = (slug: string) => {
		setSelectedSlugs((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
	};

	const togglePageSelection = () => {
		setSelectedSlugs((prev) => {
			const next = new Set(prev);
			if (allVisibleSelected) {
				for (const slug of visibleSlugs) next.delete(slug);
			} else {
				for (const slug of visibleSlugs) next.add(slug);
			}
			return next;
		});
	};

	const { mutate: bulkDelete, isPending: isBulkDeleting } = useMutation({
		...orpc.topic.bulkDelete.mutationOptions(),
		onSuccess(data) {
			toast.success(
				data.deleted === 1
					? "Deleted 1 topic"
					: `Deleted ${data.deleted} topics`,
			);
			setBulkDeleteOpen(false);
			exitSelectMode();
			void queryClient.invalidateQueries({
				queryKey: orpc.topic.list.queryKey({
					input: { packs: [packSlug], page, limit },
				}),
			});
			void queryClient.invalidateQueries({
				queryKey: orpc.pack.findOne.queryKey({ input: { slug: packSlug } }),
			});
		},
		onError(error) {
			toastOrpcMutationFailure(error, "Failed to delete topics");
		},
	});

	const handleConfirmBulkDelete = () => {
		if (selectedTopics.length === 0) return;
		bulkDelete({
			pack: packSlug,
			slugs: selectedTopics.map((t) => t.slug),
		});
	};

	const editFirstSelected = selectedTopics[0];

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
				<div className="flex items-center gap-2">
					{pagination && pagination.totalPages > 1 && (
						<span className="text-muted-foreground text-xs">
							Page {pagination.page} of {pagination.totalPages}
						</span>
					)}
					{canMutateTopics && visibleTopics.length > 0 ? (
						<Button
							variant={selectMode ? "secondary" : "outline"}
							size="sm"
							onClick={toggleSelectMode}
						>
							{selectMode ? (
								<>
									<XIcon className="size-4" />
									Cancel
								</>
							) : (
								<>
									<ListChecksIcon className="size-4" />
									Select
								</>
							)}
						</Button>
					) : null}
				</div>
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
				) : visibleTopics.length === 0 ? (
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
						{selectMode ? (
							<div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 border-dashed bg-primary/5 px-3 py-2">
								<label className="flex items-center gap-2 text-sm">
									<Checkbox
										checked={allVisibleSelected}
										indeterminate={someVisibleSelected}
										onCheckedChange={togglePageSelection}
									/>
									<span className="text-muted-foreground">
										{selectedSlugs.size === 0
											? `Select all on page (${visibleSlugs.length})`
											: `${selectedSlugs.size} selected`}
									</span>
								</label>
								<div className="flex flex-wrap items-center gap-1.5">
									<Button
										variant="outline"
										size="sm"
										disabled={selectedTopics.length === 0}
										render={
											editFirstSelected ? (
												<Link
													to="/packs/$packSlug/topics/$topicSlug"
													params={{
														packSlug,
														topicSlug: editFirstSelected.slug,
													}}
												/>
											) : undefined
										}
									>
										<PencilIcon className="size-4" />
										Open first
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={selectedTopics.length === 0}
										render={
											<Link
												to="/packs/$packSlug/topics/edit/reorder"
												params={{ packSlug }}
											/>
										}
									>
										Reorder
									</Button>
									<Button
										variant="destructive"
										size="sm"
										disabled={selectedTopics.length === 0 || isBulkDeleting}
										onClick={() => setBulkDeleteOpen(true)}
									>
										<Trash2Icon className="size-4" />
										Delete
										{selectedTopics.length > 0
											? ` (${selectedTopics.length})`
											: null}
									</Button>
								</div>
							</div>
						) : null}
						{visibleTopics.map((topic) => (
							<TopicCard
								key={topic.slug}
								canDelete={canMutateTopics && !selectMode}
								selectMode={selectMode}
								selected={selectedSlugs.has(topic.slug)}
								onToggleSelected={() => toggleSlug(topic.slug)}
								packSlug={packSlug}
								topic={topic}
							/>
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

			<BetterDialog
				opened={bulkDeleteOpen}
				setOpened={(o) => setBulkDeleteOpen(o ?? false)}
				title={`Delete ${
					selectedTopics.length === 1
						? "1 topic"
						: `${selectedTopics.length} topics`
				}?`}
				description="This cannot be undone. Remaining topics will be re-numbered."
				submit={
					<Button
						type="button"
						variant="destructive"
						disabled={isBulkDeleting || selectedTopics.length === 0}
						onClick={handleConfirmBulkDelete}
					>
						Delete{selectedTopics.length > 1 ? " all" : ""}
					</Button>
				}
			>
				<ul className="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-muted-foreground text-sm">
					{selectedTopics.map((t) => (
						<li key={t.slug}>{t.name}</li>
					))}
				</ul>
			</BetterDialog>
		</Frame>
	);
}

function TopicCard({
	topic,
	packSlug,
	canDelete,
	selectMode,
	selected,
	onToggleSelected,
}: {
	topic: GetPaginatedItem<ListTopicsOutputType>;
	packSlug: string;
	canDelete: boolean;
	selectMode: boolean;
	selected: boolean;
	onToggleSelected: () => void;
}) {
	const q = topic._count.questions;

	if (selectMode) {
		return (
			<button
				type="button"
				onClick={onToggleSelected}
				aria-pressed={selected}
				className={`group flex w-full items-center gap-2 rounded-xl border p-3 text-left transition-colors sm:gap-4 sm:p-4 ${
					selected
						? "border-primary/40 bg-primary/5"
						: "border-border hover:border-primary/30 hover:bg-primary/3"
				}`}
			>
				<Checkbox
					checked={selected}
					onCheckedChange={onToggleSelected}
					aria-label={`Select topic ${topic.name}`}
				/>
				<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground text-sm sm:size-10">
					{topic.order}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="min-w-0 truncate font-medium text-sm">
							{topic.name}
						</h3>
						<span className="shrink-0 rounded-md border border-border/80 bg-muted/40 px-1.5 py-0 text-[11px] text-muted-foreground leading-none">
							{String(q)}/{String(QUESTIONS_PER_TOPIC)} Q
						</span>
						<span className="shrink-0 rounded-md border border-border/80 bg-muted/40 px-1.5 py-0 text-[11px] text-muted-foreground tabular-nums leading-none">
							TDR {formatDifficultyDr(topic.tdr, topic.hasRatedDifficulty)}
						</span>
					</div>
					{topic.description && (
						<p className="mt-0.5 truncate text-muted-foreground text-xs">
							{topic.description}
						</p>
					)}
				</div>
			</button>
		);
	}

	return (
		<div className="group flex items-center gap-2 rounded-xl border border-border p-3 transition-colors hover:border-primary/30 hover:bg-primary/3 sm:gap-4 sm:p-4">
			<Link
				to="/packs/$packSlug/topics/$topicSlug"
				params={{ packSlug, topicSlug: topic.slug }}
				className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
			>
				<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground text-sm transition-colors group-hover:bg-primary/10 group-hover:text-primary sm:size-10">
					{topic.order}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="min-w-0 truncate font-medium text-sm">
							{topic.name}
						</h3>
						<span className="shrink-0 rounded-md border border-border/80 bg-muted/40 px-1.5 py-0 text-[11px] text-muted-foreground leading-none">
							{String(q)}/{String(QUESTIONS_PER_TOPIC)} Q
						</span>
						<span className="shrink-0 rounded-md border border-border/80 bg-muted/40 px-1.5 py-0 text-[11px] text-muted-foreground tabular-nums leading-none">
							TDR {formatDifficultyDr(topic.tdr, topic.hasRatedDifficulty)}
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
			{canDelete ? (
				<div
					className="shrink-0"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<DeleteTopicDialog
						packSlug={packSlug}
						topicName={topic.name}
						topicSlug={topic.slug}
						showLabel={false}
						triggerSize="icon"
						triggerVariant="ghost"
						className="text-muted-foreground hover:text-destructive"
					/>
				</div>
			) : null}
		</div>
	);
}
