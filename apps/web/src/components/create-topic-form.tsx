import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { CreateTopicInputSchema } from "@xamsa/schemas/modules/topic";
import { Button } from "@xamsa/ui/components/button";
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@xamsa/ui/components/carousel";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { Textarea } from "@xamsa/ui/components/textarea";
import { QUESTIONS_PER_TOPIC } from "@xamsa/utils/constants";
import { Check, Sparkles } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
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

export function CreateTopicForm({ packSlug }: CreateTopicFormProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const [api, setApi] = useState<CarouselApi>();
	const [currentSlide, setCurrentSlide] = useState(0);

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
			form.reset();
			toast.success("Topic created successfully");
			navigate({ to: `/packs/${packSlug}/topics/${slug}`, replace: true });
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
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
			toast.error(error.message || "AI generation failed. Please try again.");
		},
	});

	const onSubmit = form.handleSubmit(
		async (values) => {
			createTopic({ ...values, pack: packSlug });
		},
		(errors) => {
			// Navigate to the first question with an error
			if (errors.questions) {
				const questions = errors.questions as Record<string, unknown>[];
				const firstErrorIndex = questions.findIndex((q) => q !== undefined);
				if (firstErrorIndex !== -1) {
					api?.scrollTo(firstErrorIndex);
					toast.error(`Question ${firstErrorIndex + 1} has errors`);
					return;
				}
			}

			if (errors.name) {
				toast.error("Please fill in the topic name");
			}
		},
	);

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
	const aiDisabled =
		!session?.user ||
		!topicName?.trim() ||
		aiRemaining === 0 ||
		isAiPending ||
		isPending;

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
				<FrameTitle>Create a new topic</FrameTitle>
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
			<form onSubmit={onSubmit} className="space-y-4">
				<FramePanel className="space-y-4">
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
							disabled={aiDisabled}
							onClick={() => {
								generateWithAi({
									pack: packSlug,
									topicName: topicName.trim(),
									topicDescription: topicDescription?.trim() || undefined,
								});
							}}
						>
							<Sparkles className="mr-1.5 size-4" />
							{isAiPending ? "Generating…" : "Generate with AI"}
						</Button>
					</div>
					<p className="text-muted-foreground text-xs">
						AI fills all five questions from the topic and pack name. Always
						verify facts before publishing.
					</p>
				</FramePanel>

				<FramePanel className="space-y-4">
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
									<div className="space-y-5 px-1">
										<form.Input
											name={`questions.${index}.text`}
											label={`Question ${index + 1}`}
										>
											{(f) => (
												<Textarea
													{...f}
													placeholder="Enter question text"
													maxLength={1000}
													rows={3}
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
					<form.Submit
						isLoading={isPending}
						loadingText="Creating topic..."
						disabled={filledCount < QUESTIONS_PER_TOPIC}
					>
						Create Topic
					</form.Submit>
				</FrameFooter>
			</form>
		</Frame>
	);
}
