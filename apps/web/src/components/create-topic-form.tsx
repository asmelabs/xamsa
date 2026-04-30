import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	CreateTopicInputSchema,
	type CreateTopicInputType,
} from "@xamsa/schemas/modules/topic";
import { Button, buttonVariants } from "@xamsa/ui/components/button";
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@xamsa/ui/components/carousel";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@xamsa/ui/components/dropdown-menu";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { Label } from "@xamsa/ui/components/label";
import { Textarea } from "@xamsa/ui/components/textarea";
import { cn } from "@xamsa/ui/lib/utils";
import { QUESTIONS_PER_TOPIC } from "@xamsa/utils/constants";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import type { SubmitErrorHandler } from "react-hook-form";
import { toast } from "sonner";
import { AcceptableAnswersChips } from "@/components/acceptable-answers-chips";
import { LoadingButton } from "@/components/loading-button";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";

const emptyQuestion = {
	text: "",
	answer: "",
	acceptableAnswers: [] as string[],
	description: "",
	explanation: "",
};

interface CreateTopicFormProps {
	packSlug: string;
}

type CreateTopicFormFieldValues = Omit<CreateTopicInputType, "pack">;

export function CreateTopicForm({ packSlug }: CreateTopicFormProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const createNavigationModeRef = useRef<"continue" | "go">("continue");
	const { data: session } = authClient.useSession();
	const [api, setApi] = useState<CarouselApi>();
	const [currentSlide, setCurrentSlide] = useState(0);
	const [aiAuthorDialogOpen, setAiAuthorDialogOpen] = useState(false);
	const [aiAuthorPromptDraft, setAiAuthorPromptDraft] = useState("");
	const [aiTopicDialogOpen, setAiTopicDialogOpen] = useState(false);
	const [aiTopicSeedDraft, setAiTopicSeedDraft] = useState("");
	const [aiTopicAuthorPromptDraft, setAiTopicAuthorPromptDraft] = useState("");

	const [defaultName] = useQueryState("name");
	const [defaultDescription] = useQueryState("description");

	const form = useAppForm({
		schema: CreateTopicInputSchema.omit({ pack: true }),
		defaultValues: {
			name: defaultName || "",
			description: defaultDescription || "",
			questions: Array.from({ length: QUESTIONS_PER_TOPIC }, () => ({
				...emptyQuestion,
			})),
		},
	});

	const { data: aiQuota } = useQuery({
		...orpc.topic.getAiQuota.queryOptions({ input: {} }),
		enabled: !!session?.user,
	});

	const { mutate: createTopic, isPending } = useMutation({
		...orpc.topic.create.mutationOptions(),
		onSuccess({ slug }) {
			form.reset({
				name: "",
				description: "",
				questions: Array.from({ length: QUESTIONS_PER_TOPIC }, () => ({
					...emptyQuestion,
				})),
			});
			toast.success("Topic created successfully");
			const mode = createNavigationModeRef.current;
			if (mode === "continue") {
				navigate({
					to: "/packs/$packSlug/topics/new",
					params: { packSlug },
					replace: true,
				});
			} else {
				navigate({
					to: "/packs/$packSlug/topics/$topicSlug",
					params: { packSlug, topicSlug: slug },
					replace: true,
				});
			}
		},
		onError(error) {
			toastOrpcMutationFailure(
				error,
				"An unknown error occurred. Please try again.",
			);
		},
	});

	const { mutate: generateWithAi, isPending: isAiPending } = useMutation({
		...orpc.topic.generateQuestions.mutationOptions(),
		onSuccess(data) {
			data.questions.forEach((q, i) => {
				form.setValue(`questions.${i}.text`, q.text);
				form.setValue(`questions.${i}.answer`, q.answer);
				form.setValue(
					`questions.${i}.acceptableAnswers`,
					q.acceptableAnswers ?? [],
				);
				form.setValue(`questions.${i}.description`, q.description ?? "");
				form.setValue(`questions.${i}.explanation`, q.explanation ?? "");
			});
			void queryClient.invalidateQueries({
				queryKey: orpc.topic.getAiQuota.queryKey({ input: {} }),
			});
			toast.success("AI draft added — review facts before saving.");
		},
		onError(error) {
			toastOrpcMutationFailure(
				error,
				"AI generation failed. Please try again.",
			);
		},
	});

	const { mutate: generateTopicAi, isPending: isAiTopicPending } = useMutation({
		...orpc.topic.generateTopic.mutationOptions(),
		onSuccess(data) {
			form.setValue("name", data.name);
			form.setValue("description", data.description ?? "");
			void queryClient.invalidateQueries({
				queryKey: orpc.topic.getAiQuota.queryKey({ input: {} }),
			});
			toast.success("AI topic added — review before saving.");
		},
		onError(error) {
			toastOrpcMutationFailure(
				error,
				"AI topic generation failed. Please try again.",
			);
		},
	});

	const onFormValidationError: SubmitErrorHandler<
		CreateTopicFormFieldValues
	> = (errors) => {
		const questionFieldErrors = errors.questions;
		if (questionFieldErrors && Array.isArray(questionFieldErrors)) {
			const firstErrorIndex = questionFieldErrors.findIndex(
				(q) => q !== undefined,
			);
			if (firstErrorIndex !== -1) {
				api?.scrollTo(firstErrorIndex);
				toast.error(`Question ${firstErrorIndex + 1} has errors`);
				return;
			}
		}

		if (errors.name) {
			toast.error("Please fill in the topic name");
		}
	};

	const onSubmit = form.handleSubmit((values) => {
		createNavigationModeRef.current = "continue";
		createTopic({ ...values, pack: packSlug });
	}, onFormValidationError);

	const submitForCreate = (mode: "continue" | "go") => {
		createNavigationModeRef.current = mode;
		void form.handleSubmit((values) => {
			createTopic({ ...values, pack: packSlug });
		}, onFormValidationError)();
	};

	// Track which questions are filled (have both text and answer)
	const [topicName, topicDescription, questions] = form.watch([
		"name",
		"description",
		"questions",
	]);
	const questionStatus = questions.map(
		(q) => q.text.trim().length > 0 && q.answer.trim().length > 0,
	);
	const filledCount = questionStatus.filter(Boolean).length;

	const aiRemaining = aiQuota
		? Math.max(0, aiQuota.limit - aiQuota.used)
		: null;
	const aiBusy = isAiPending || isAiTopicPending || isPending;
	const aiQuestionsDisabled =
		!session?.user || !topicName?.trim() || aiRemaining === 0 || aiBusy;
	const aiTopicDisabled = !session?.user || aiRemaining === 0 || aiBusy;

	useEffect(() => {
		if (!api) return;
		const onSelect = () => setCurrentSlide(api.selectedScrollSnap());
		api.on("select", onSelect);
		return () => {
			api.off("select", onSelect);
		};
	}, [api]);

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Topic and questions</FrameTitle>
				<p className="text-muted-foreground text-sm">
					Need many topics?{" "}
					<Link
						className="text-primary underline"
						to="/packs/$packSlug/topics/bulk"
						params={{ packSlug }}
					>
						Create several at once
					</Link>
					.
				</p>
			</FrameHeader>
			<form onSubmit={onSubmit} className="space-y-3">
				<FramePanel className="space-y-3">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<p className="font-semibold text-sm">Topic</p>
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={aiTopicDisabled}
							onClick={() => {
								setAiTopicSeedDraft("");
								setAiTopicAuthorPromptDraft("");
								setAiTopicDialogOpen(true);
							}}
						>
							<Sparkles className="mr-1.5 size-4" />
							{isAiTopicPending ? "Generating…" : "Generate topic with AI"}
						</Button>
					</div>
					<form.Input name="name" label="Name">
						{(field) => (
							<Input
								{...field}
								placeholder="Enter your topic name"
								maxLength={100}
							/>
						)}
					</form.Input>
					<form.Input name="description" label="Description">
						{(field) => (
							<Textarea
								{...field}
								value={field.value || ""}
								placeholder="Enter your topic description"
								maxLength={1000}
								rows={2}
							/>
						)}
					</form.Input>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						{aiQuota && (
							<p className="text-muted-foreground text-xs">
								AI generations today: {String(aiQuota.used)} /{" "}
								{String(aiQuota.limit)} (resets{" "}
								{new Date(aiQuota.resetsAt).toUTCString()} UTC)
							</p>
						)}
						<Button
							type="button"
							variant="secondary"
							disabled={aiQuestionsDisabled}
							onClick={() => {
								setAiAuthorPromptDraft("");
								setAiAuthorDialogOpen(true);
							}}
						>
							<Sparkles className="mr-1.5 size-4" />
							{isAiPending ? "Generating…" : "Generate questions with AI"}
						</Button>
					</div>
					<p className="text-muted-foreground text-xs">
						AI can seed a fresh topic name + description, or fill all five
						questions from your topic and pack. Always verify facts before
						publishing. Each AI run costs one daily generation.
					</p>
					<Dialog
						onOpenChange={(o) => {
							setAiAuthorDialogOpen(o);
							if (!o) setAiAuthorPromptDraft("");
						}}
						open={aiAuthorDialogOpen}
					>
						<DialogContent className="sm:max-w-lg" showCloseButton>
							<DialogHeader>
								<DialogTitle>Generate questions with AI</DialogTitle>
								<DialogDescription>
									Optional: add instructions (difficulty, tone, things to
									include or avoid). Leave empty for the default prompt.
								</DialogDescription>
							</DialogHeader>
							<DialogPanel>
								<div className="space-y-2">
									<Label htmlFor="create-ai-author-prompt">
										Additional instructions
									</Label>
									<Textarea
										id="create-ai-author-prompt"
										maxLength={2000}
										onChange={(e) => setAiAuthorPromptDraft(e.target.value)}
										placeholder="e.g. harder clues, 1990s only, no politics…"
										rows={5}
										value={aiAuthorPromptDraft}
									/>
									<p className="text-muted-foreground text-xs">
										{aiAuthorPromptDraft.length}/2000 characters
									</p>
								</div>
							</DialogPanel>
							<DialogFooter>
								<Button
									onClick={() => setAiAuthorDialogOpen(false)}
									type="button"
									variant="outline"
								>
									Cancel
								</Button>
								<Button
									disabled={isAiPending}
									onClick={() => {
										const ap = aiAuthorPromptDraft.trim() || undefined;
										setAiAuthorDialogOpen(false);
										setAiAuthorPromptDraft("");
										generateWithAi({
											pack: packSlug,
											topicName: topicName.trim(),
											topicDescription: topicDescription?.trim() || undefined,
											authorPrompt: ap,
										});
									}}
									type="button"
								>
									{isAiPending ? "Generating…" : "Generate"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<Dialog
						onOpenChange={(o) => {
							setAiTopicDialogOpen(o);
							if (!o) {
								setAiTopicSeedDraft("");
								setAiTopicAuthorPromptDraft("");
							}
						}}
						open={aiTopicDialogOpen}
					>
						<DialogContent className="sm:max-w-lg" showCloseButton>
							<DialogHeader>
								<DialogTitle>Generate topic with AI</DialogTitle>
								<DialogDescription>
									AI proposes a topic name and a one-sentence description that
									fits the pack and avoids duplicating its existing topics. Both
									fields are optional.
								</DialogDescription>
							</DialogHeader>
							<DialogPanel>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="create-ai-topic-seed">
											Seed / hint (optional)
										</Label>
										<Input
											id="create-ai-topic-seed"
											maxLength={200}
											onChange={(e) => setAiTopicSeedDraft(e.target.value)}
											placeholder="e.g. phonetic constraint, Cuban history…"
											value={aiTopicSeedDraft}
										/>
										<p className="text-muted-foreground text-xs">
											{aiTopicSeedDraft.length}/200 characters
										</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="create-ai-topic-author-prompt">
											Additional instructions (optional)
										</Label>
										<Textarea
											id="create-ai-topic-author-prompt"
											maxLength={2000}
											onChange={(e) =>
												setAiTopicAuthorPromptDraft(e.target.value)
											}
											placeholder="e.g. avoid sports topics, lean toward literature…"
											rows={4}
											value={aiTopicAuthorPromptDraft}
										/>
										<p className="text-muted-foreground text-xs">
											{aiTopicAuthorPromptDraft.length}/2000 characters
										</p>
									</div>
								</div>
							</DialogPanel>
							<DialogFooter>
								<Button
									onClick={() => setAiTopicDialogOpen(false)}
									type="button"
									variant="outline"
								>
									Cancel
								</Button>
								<Button
									disabled={isAiTopicPending}
									onClick={() => {
										const seed = aiTopicSeedDraft.trim() || undefined;
										const ap = aiTopicAuthorPromptDraft.trim() || undefined;
										setAiTopicDialogOpen(false);
										setAiTopicSeedDraft("");
										setAiTopicAuthorPromptDraft("");
										generateTopicAi({
											pack: packSlug,
											seed,
											authorPrompt: ap,
										});
									}}
									type="button"
								>
									{isAiTopicPending ? "Generating…" : "Generate"}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</FramePanel>

				<FramePanel className="space-y-3">
					<div className="flex items-center justify-between">
						<p className="font-semibold text-sm">
							Questions{" "}
							<span className="font-normal text-muted-foreground">
								({filledCount}/{QUESTIONS_PER_TOPIC})
							</span>
						</p>
					</div>

					{/* Dot indicators */}
					<div className="flex items-center justify-center gap-2">
						{Array.from({ length: QUESTIONS_PER_TOPIC }, (_, i) => (
							<button
								key={i}
								type="button"
								onClick={() => api?.scrollTo(i)}
								className={`flex size-7 items-center justify-center rounded-full border text-xs transition-all ${
									currentSlide === i
										? "border-primary bg-primary text-primary-foreground"
										: questionStatus[i]
											? "border-primary/50 bg-primary/10 text-primary"
											: "border-border text-muted-foreground"
								}`}
							>
								{questionStatus[i] ? <Check className="size-3.5" /> : i + 1}
							</button>
						))}
					</div>

					{/* Carousel */}
					<Carousel
						setApi={setApi}
						opts={{ watchDrag: false }}
						className="mx-auto w-full"
					>
						<CarouselContent>
							{Array.from({ length: QUESTIONS_PER_TOPIC }, (_, index) => (
								<CarouselItem key={index}>
									<div className="space-y-3 px-1">
										<form.Input
											name={`questions.${index}.text`}
											label={`Question ${index + 1}`}
										>
											{(f) => (
												<Textarea
													{...f}
													placeholder="Enter question text"
													maxLength={1000}
													rows={2}
												/>
											)}
										</form.Input>

										<form.Input
											name={`questions.${index}.answer`}
											label="Answer"
										>
											{(f) => (
												<Input
													{...f}
													placeholder="Enter the correct answer"
													maxLength={250}
												/>
											)}
										</form.Input>

										<form.Input
											name={`questions.${index}.acceptableAnswers`}
											label="Alternate acceptable answers (optional)"
											description="Other spellings or forms that count as correct."
										>
											{(f) => (
												<AcceptableAnswersChips
													ref={f.ref}
													name={f.name}
													disabled={f.disabled}
													onBlur={f.onBlur}
													onChange={f.onChange}
													value={f.value}
												/>
											)}
										</form.Input>

										<form.Input
											name={`questions.${index}.explanation`}
											label="Explanation (optional)"
										>
											{(f) => (
												<Textarea
													{...f}
													value={f.value || ""}
													placeholder="Optional note about the answer for the host"
													maxLength={1000}
													rows={2}
												/>
											)}
										</form.Input>
									</div>
								</CarouselItem>
							))}
						</CarouselContent>

						<div className="mt-4 flex items-center justify-between">
							<CarouselPrevious
								className="static translate-y-0"
								type="button"
							/>
							<p className="text-muted-foreground text-xs">
								{currentSlide + 1} of {QUESTIONS_PER_TOPIC}
							</p>
							<CarouselNext className="static translate-y-0" type="button" />
						</div>
					</Carousel>
				</FramePanel>

				<FrameFooter>
					<div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
						<div className="inline-flex w-full min-w-0 sm:w-auto">
							<LoadingButton
								type="submit"
								variant="default"
								className="min-w-0 flex-1 rounded-r-none sm:min-w-56"
								disabled={filledCount < QUESTIONS_PER_TOPIC}
								isLoading={isPending}
								loadingText="Creating…"
							>
								Create and Continue
							</LoadingButton>
							<DropdownMenu>
								<DropdownMenuTrigger
									className={cn(
										buttonVariants({ variant: "default", size: "default" }),
										"shrink-0 rounded-l-none border-primary-foreground/25 border-l px-2.5 disabled:opacity-64",
									)}
									disabled={filledCount < QUESTIONS_PER_TOPIC || isPending}
									type="button"
								>
									<ChevronDown className="size-4 opacity-90" aria-hidden />
									<span className="sr-only">More create options</span>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="min-w-44">
									<DropdownMenuItem
										disabled={filledCount < QUESTIONS_PER_TOPIC || isPending}
										onClick={() => {
											submitForCreate("go");
										}}
									>
										Create and Go
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>
				</FrameFooter>
			</form>
		</Frame>
	);
}
