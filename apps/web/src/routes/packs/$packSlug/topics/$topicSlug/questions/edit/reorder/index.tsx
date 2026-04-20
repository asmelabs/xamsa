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
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ListTopicQuestionsOutputType } from "@xamsa/schemas/modules/question";
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
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute(
	"/packs/$packSlug/topics/$topicSlug/questions/edit/reorder/",
)({
	component: RouteComponent,
});

type QuestionItem = ListTopicQuestionsOutputType[number];

function RouteComponent() {
	const { packSlug, topicSlug } = Route.useParams();
	const navigate = useNavigate();

	const {
		data: questionsData,
		isLoading,
		error,
	} = useQuery({
		...orpc.question.listTopicQuestions.queryOptions({
			input: {
				topic: topicSlug,
				pack: packSlug,
			},
		}),
		retry: false,
	});

	const [orderedQuestions, setOrderedQuestions] = useState<
		QuestionItem[] | null
	>(null);

	// Sort incoming data by order, then derive the working list
	const sortedData = useMemo(() => {
		if (!questionsData) return null;
		return [...questionsData].sort((a, b) => a.order - b.order);
	}, [questionsData]);

	const questions = useMemo(() => {
		if (orderedQuestions) return orderedQuestions;
		return sortedData ?? [];
	}, [orderedQuestions, sortedData]);

	// Initialize local state when data first arrives
	if (sortedData && !orderedQuestions) {
		setOrderedQuestions([...sortedData]);
	}

	// Track which questions have moved from their original position
	const changes = useMemo(() => {
		if (!sortedData || !orderedQuestions) return new Map<string, number>();

		const original = new Map(sortedData.map((q) => [q.slug, q.order]));
		const changed = new Map<string, number>();

		orderedQuestions.forEach((question, index) => {
			const newOrder = index + 1;
			const originalOrder = original.get(question.slug);
			if (originalOrder !== newOrder) {
				changed.set(question.slug, newOrder - (originalOrder ?? newOrder));
			}
		});

		return changed;
	}, [sortedData, orderedQuestions]);

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
			if (!over || active.id === over.id || !orderedQuestions) return;

			const oldIndex = orderedQuestions.findIndex((q) => q.slug === active.id);
			const newIndex = orderedQuestions.findIndex((q) => q.slug === over.id);

			setOrderedQuestions(arrayMove(orderedQuestions, oldIndex, newIndex));
		},
		[orderedQuestions],
	);

	const handleReset = () => {
		if (sortedData) {
			setOrderedQuestions([...sortedData]);
		}
	};

	const { mutate: updateOrder, isPending } = useMutation({
		...orpc.question.updateOrder.mutationOptions(),
		onSuccess() {
			toast.success("Question order updated successfully");
			navigate({
				to: "/packs/$packSlug/topics/$topicSlug",
				params: { packSlug, topicSlug },
			});
		},
		onError(error) {
			toast.error(
				error.message || "Failed to update question order. Please try again.",
			);
		},
	});

	const handleSave = () => {
		if (!orderedQuestions) return;

		updateOrder({
			pack: packSlug,
			topic: topicSlug,
			questions: orderedQuestions.map((question, index) => ({
				slug: question.slug,
				order: index + 1,
			})),
		});
	};

	return (
		<div className="container mx-auto max-w-3xl space-y-6 py-10">
			<Button
				variant="ghost"
				size="sm"
				render={
					<Link
						to="/packs/$packSlug/topics/$topicSlug"
						params={{ packSlug, topicSlug }}
					/>
				}
			>
				<ArrowLeftIcon />
				Back to topic
			</Button>

			<Frame>
				<FrameHeader className="flex items-center justify-between">
					<FrameTitle>Reorder Questions</FrameTitle>
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
							<AlertTitle>Failed to load questions</AlertTitle>
							<AlertDescription>
								Something went wrong. Please try refreshing the page.
							</AlertDescription>
						</Alert>
					) : questions.length === 0 ? (
						<p className="py-12 text-center text-muted-foreground">
							No questions to reorder.
						</p>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							modifiers={[restrictToVerticalAxis]}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={questions.map((q) => q.slug)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-1.5">
									{questions.map((question, index) => {
										const diff = changes.get(question.slug);
										return (
											<SortableQuestionItem
												key={question.slug}
												question={question}
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

				{questions.length > 0 && (
					<FrameFooter>
						<div className="flex items-center justify-between">
							<p className="text-muted-foreground text-sm">
								{hasChanges
									? `${changes.size} ${
											changes.size === 1 ? "question" : "questions"
										} moved`
									: "Drag questions to reorder them"}
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

function SortableQuestionItem({
	question,
	newOrder,
	diff,
}: {
	question: QuestionItem;
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
	} = useSortable({ id: question.slug });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const hasMoved = diff !== undefined;
	const points = newOrder * 100;

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
				<p className="truncate font-medium text-sm">{question.text}</p>
				<p className="truncate text-muted-foreground text-xs">
					Answer: {question.answer}
				</p>
			</div>

			<span className="shrink-0 text-muted-foreground text-xs">
				{points} pts
			</span>

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
