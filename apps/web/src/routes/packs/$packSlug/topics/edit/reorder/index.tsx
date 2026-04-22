/** biome-ignore-all lint/style/noNonNullAssertion: we need to use non-null assertions to avoid type errors */
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	notFound,
	useNavigate,
} from "@tanstack/react-router";
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
import { Spinner } from "@xamsa/ui/components/spinner";
import { MAX_TOPICS_PER_PACK } from "@xamsa/utils/constants";
import {
	ArrowLeftIcon,
	GripVertical,
	MoveDown,
	MoveUp,
	Undo2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/loading-button";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/packs/$packSlug/topics/edit/reorder/")({
	component: RouteComponent,
	loader: async ({ params }) => {
		try {
			const pack = await orpc.pack.findOne.call({ slug: params.packSlug });
			return { pack };
		} catch {
			throw notFound();
		}
	},
	head: ({ loaderData }) => {
		if (!loaderData) {
			return pageSeo({
				title: "Reorder topics",
				description:
					"Drag and drop topics in your pack to set the order players will see when you host a game.",
				noIndex: true,
			});
		}
		const { pack } = loaderData;
		return pageSeo({
			title: `Reorder topics · ${pack.name}`,
			description: `Change the order of topics in your pack “${pack.name}” on Xamsa before publishing or hosting. Drag rows, then save.`,
			path: `/packs/${pack.slug}/topics/edit/reorder/`,
			ogTitle: `Reorder topics: ${pack.name}`,
			keywords: `Xamsa, edit pack, topic order, ${pack.name}`,
			noIndex: true,
		});
	},
});

type TopicItem = GetPaginatedItem<ListTopicsOutputType>;

function RouteComponent() {
	const { packSlug } = Route.useParams();
	const navigate = useNavigate();

	const {
		data: topicsData,
		isLoading,
		error,
	} = useQuery({
		...orpc.topic.list.queryOptions({
			input: {
				packs: [packSlug],
				page: 1,
				limit: MAX_TOPICS_PER_PACK,
			},
		}),
		retry: false,
	});

	const [orderedTopics, setOrderedTopics] = useState<TopicItem[] | null>(null);

	// Initialize local state once data loads
	const topics = useMemo(() => {
		if (orderedTopics) return orderedTopics;
		return topicsData?.items ?? [];
	}, [orderedTopics, topicsData]);

	// Set initial state when data first arrives
	if (topicsData?.items && !orderedTopics) {
		setOrderedTopics([...topicsData.items]);
	}

	// Track which topics have moved from their original position
	const changes = useMemo(() => {
		if (!topicsData?.items || !orderedTopics) return new Map<string, number>();

		const original = new Map(topicsData.items.map((t) => [t.slug, t.order]));
		const changed = new Map<string, number>();

		orderedTopics.forEach((topic, index) => {
			const newOrder = index + 1;
			const originalOrder = original.get(topic.slug);
			if (originalOrder !== newOrder) {
				changed.set(topic.slug, newOrder - (originalOrder ?? newOrder));
			}
		});

		return changed;
	}, [topicsData?.items, orderedTopics]);

	const hasChanges = changes.size > 0;

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id || !orderedTopics) return;

			const oldIndex = orderedTopics.findIndex((t) => t.slug === active.id);
			const newIndex = orderedTopics.findIndex((t) => t.slug === over.id);

			setOrderedTopics(arrayMove(orderedTopics, oldIndex, newIndex));
		},
		[orderedTopics],
	);

	const handleReset = () => {
		if (topicsData?.items) {
			setOrderedTopics([...topicsData.items]);
		}
	};

	const { mutate: updateOrder, isPending } = useMutation({
		...orpc.topic.updateOrder.mutationOptions(),
		onSuccess() {
			toast.success("Topic order updated successfully");
			navigate({
				to: "/packs/$packSlug",
				params: { packSlug },
			});
		},
		onError(error) {
			toast.error(
				error.message || "Failed to update topic order. Please try again.",
			);
		},
	});

	const handleSave = () => {
		if (!orderedTopics) return;

		updateOrder({
			pack: packSlug,
			topics: orderedTopics.map((topic, index) => ({
				slug: topic.slug,
				order: index + 1,
			})),
		});
	};

	return (
		<div className="container mx-auto max-w-3xl space-y-6 py-10">
			<Button
				variant="ghost"
				size="sm"
				render={<Link to="/packs/$packSlug" params={{ packSlug }} />}
			>
				<ArrowLeftIcon />
				Back to pack
			</Button>

			<h1 className="font-bold text-2xl tracking-tight">Reorder topics</h1>

			<Frame>
				<FrameHeader className="flex items-center justify-between">
					<FrameTitle>Reorder Topics</FrameTitle>
					{hasChanges && (
						<Button variant="ghost" size="sm" onClick={handleReset}>
							<Undo2 />
							Reset
						</Button>
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
					) : topics.length === 0 ? (
						<p className="py-12 text-center text-muted-foreground">
							No topics to reorder.
						</p>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							modifiers={[restrictToVerticalAxis]}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={topics.map((t) => t.slug)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-1.5">
									{topics.map((topic, index) => {
										const diff = changes.get(topic.slug);
										return (
											<SortableTopicItem
												key={topic.slug}
												topic={topic}
												newOrder={index + 1}
												diff={diff}
											/>
										);
									})}
								</div>
							</SortableContext>
						</DndContext>
					)}
				</FramePanel>

				{topics.length > 0 && (
					<FrameFooter>
						<div className="flex items-center justify-between">
							<p className="text-muted-foreground text-sm">
								{hasChanges
									? `${changes.size} ${changes.size === 1 ? "topic" : "topics"} moved`
									: "Drag topics to reorder them"}
							</p>
							<LoadingButton
								onClick={handleSave}
								disabled={!hasChanges}
								isLoading={isPending}
								loadingText="Saving..."
							>
								Save order
							</LoadingButton>
						</div>
					</FrameFooter>
				)}
			</Frame>
		</div>
	);
}

function SortableTopicItem({
	topic,
	newOrder,
	diff,
}: {
	topic: TopicItem;
	newOrder: number;
	diff: number | undefined;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: topic.slug });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const hasMoved = diff !== undefined;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
				isDragging
					? "z-50 border-primary/50 bg-primary/5 shadow-lg"
					: hasMoved
						? "border-primary/30 bg-primary/3"
						: "border-border bg-background"
			}`}
		>
			<button
				type="button"
				className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="size-4" />
			</button>

			<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground text-xs">
				{newOrder}
			</div>

			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{topic.name}</p>
				{topic.description && (
					<p className="truncate text-muted-foreground text-xs">
						{topic.description}
					</p>
				)}
			</div>

			{hasMoved && (
				<div
					className={`flex items-center gap-0.5 text-xs ${
						diff! > 0 ? "text-red-500" : "text-green-500"
					}`}
				>
					{diff! > 0 ? (
						<MoveDown className="size-3" />
					) : (
						<MoveUp className="size-3" />
					)}
					{Math.abs(diff!)}
				</div>
			)}
		</div>
	);
}
