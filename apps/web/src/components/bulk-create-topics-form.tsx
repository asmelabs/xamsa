import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
	BULK_TOPICS_MAX,
	BULK_TOPICS_MAX_TSUAL_IMPORT,
} from "@xamsa/schemas/common/bulk";
import { CreateTopicPayloadSchema } from "@xamsa/schemas/modules/topic";
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from "@xamsa/ui/components/dialog";
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
import { Check, Download, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useFieldArray, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AcceptableAnswersChips } from "@/components/acceptable-answers-chips";
import { FormInput } from "@/components/form-input";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";
import { TopicBulkJobDialog } from "./topic-bulk-job-dialog";
import { TopicImportDialog } from "./topic-import-dialog";

const emptyQuestion = {
	text: "",
	answer: "",
	acceptableAnswers: [] as string[],
	description: "",
	explanation: "",
};

function emptyTopic(): z.infer<typeof CreateTopicPayloadSchema> {
	return {
		name: "",
		description: "",
		questions: Array.from({ length: QUESTIONS_PER_TOPIC }, () => ({
			...emptyQuestion,
		})),
	};
}

interface BulkCreateTopicsFormProps {
	packSlug: string;
}

function isModeratorOrAdmin(
	user: { role?: string } | undefined,
): user is { role: "moderator" | "admin" } {
	const r = user?.role;
	return r === "moderator" || r === "admin";
}

type BulkTopicsFormValues = {
	topics: z.infer<typeof CreateTopicPayloadSchema>[];
};

function BulkTopicQuestionsCarousel({ topicIndex }: { topicIndex: number }) {
	const { control, watch } = useFormContext<BulkTopicsFormValues>();
	const [api, setApi] = useState<CarouselApi>();
	const [currentSlide, setCurrentSlide] = useState(0);

	const questions = watch(`topics.${topicIndex}.questions`) ?? [];
	const questionStatus = questions.map(
		(q) => q.text.trim().length > 0 && q.answer.trim().length > 0,
	);
	const filledCount = questionStatus.filter(Boolean).length;

	useEffect(() => {
		if (!api) return;
		const onSelect = () => setCurrentSlide(api.selectedScrollSnap());
		api.on("select", onSelect);
		return () => {
			api.off("select", onSelect);
		};
	}, [api]);

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="font-semibold text-sm">
					Questions{" "}
					<span className="font-normal text-muted-foreground">
						({filledCount}/{QUESTIONS_PER_TOPIC})
					</span>
				</p>
			</div>

			<div className="flex items-center justify-center gap-2">
				{Array.from({ length: QUESTIONS_PER_TOPIC }, (_, i) => (
					<button
						key={i}
						type="button"
						onClick={() => api?.scrollTo(i)}
						className={cn(
							"flex size-7 items-center justify-center rounded-full border text-xs transition-all",
							currentSlide === i
								? "border-primary bg-primary text-primary-foreground"
								: questionStatus[i]
									? "border-primary/50 bg-primary/10 text-primary"
									: "border-border text-muted-foreground",
						)}
					>
						{questionStatus[i] ? <Check className="size-3.5" /> : i + 1}
					</button>
				))}
			</div>

			<Carousel
				className="mx-auto w-full"
				opts={{ watchDrag: false }}
				setApi={setApi}
			>
				<CarouselContent>
					{Array.from({ length: QUESTIONS_PER_TOPIC }, (_, index) => (
						<CarouselItem key={index}>
							<div className="space-y-3 px-1">
								<FormInput
									control={control}
									name={`topics.${topicIndex}.questions.${index}.text`}
									label={`Question ${index + 1}`}
								>
									{(f) => (
										<Textarea
											{...f}
											placeholder="Clue / question"
											maxLength={1000}
											rows={2}
										/>
									)}
								</FormInput>

								<FormInput
									control={control}
									name={`topics.${topicIndex}.questions.${index}.answer`}
									label="Answer"
								>
									{(f) => (
										<Input
											{...f}
											placeholder="Primary answer"
											maxLength={250}
										/>
									)}
								</FormInput>

								<FormInput
									control={control}
									name={`topics.${topicIndex}.questions.${index}.acceptableAnswers`}
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
								</FormInput>

								<FormInput
									control={control}
									name={`topics.${topicIndex}.questions.${index}.explanation`}
									label="Explanation (optional)"
								>
									{(f) => (
										<Textarea
											{...f}
											maxLength={1000}
											placeholder="Optional note about the answer for the host"
											rows={2}
											value={f.value || ""}
										/>
									)}
								</FormInput>
							</div>
						</CarouselItem>
					))}
				</CarouselContent>

				<div className="mt-4 flex items-center justify-between">
					<CarouselPrevious className="static translate-y-0" type="button" />
					<p className="text-muted-foreground text-xs">
						{currentSlide + 1} of {QUESTIONS_PER_TOPIC}
					</p>
					<CarouselNext className="static translate-y-0" type="button" />
				</div>
			</Carousel>
		</div>
	);
}

export function BulkCreateTopicsForm({ packSlug }: BulkCreateTopicsFormProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const canImport3sual = isModeratorOrAdmin(session?.user);

	const locationState = useRouterState({
		select: (s) => s.location.state,
	});
	const consumedLocationPrefillRef = useRef(false);

	const [importDialogOpen, setImportDialogOpen] = useState(false);
	const [importedViaStructuredImport, setImportedViaStructuredImport] =
		useState(false);
	/** Set after a successful 3sual preview; sent with bulkCreate to record the import. */
	const [pendingTsualPackageId, setPendingTsualPackageId] = useState<
		number | null
	>(null);
	const [tsualSourceName, setTsualSourceName] = useState<string | null>(null);
	const [jobDialogOpen, setJobDialogOpen] = useState(false);
	const [activeJobId, setActiveJobId] = useState<string | null>(null);
	const [aiAuthorDialog, setAiAuthorDialog] = useState<{
		topicIndex: number;
		authorPrompt: string;
	} | null>(null);
	const [aiTopicDialog, setAiTopicDialog] = useState<{
		topicIndex: number;
		seed: string;
		authorPrompt: string;
	} | null>(null);
	const lastSubmittedTopicCount = useRef(0);

	const { data: aiQuota } = useQuery({
		...orpc.topic.getAiQuota.queryOptions({ input: {} }),
		enabled: !!session?.user,
	});

	const { mutate: generateWithAi, isPending: isAiPending } = useMutation({
		...orpc.topic.generateQuestions.mutationOptions(),
	});

	const { mutate: generateTopicAi, isPending: isAiTopicPending } = useMutation({
		...orpc.topic.generateTopic.mutationOptions(),
	});

	const largeBatchAllowed =
		pendingTsualPackageId !== null || importedViaStructuredImport;

	const formSchema = useMemo(
		() =>
			z.object({
				topics: z
					.array(CreateTopicPayloadSchema)
					.min(1)
					.max(
						largeBatchAllowed ? BULK_TOPICS_MAX_TSUAL_IMPORT : BULK_TOPICS_MAX,
					),
			}),
		[largeBatchAllowed],
	);

	const form = useAppForm({
		schema: formSchema,
		defaultValues: {
			topics: [emptyTopic()],
		},
	});

	useEffect(() => {
		const s = locationState as
			| {
					prefilledTopics?: z.infer<typeof CreateTopicPayloadSchema>[];
					importedViaStructuredImport?: boolean;
					prefilledTsualPackageId?: number;
					prefilledTsualSourceName?: string;
			  }
			| undefined;

		if (!s?.prefilledTopics?.length) {
			consumedLocationPrefillRef.current = false;
			return;
		}
		if (consumedLocationPrefillRef.current) return;
		consumedLocationPrefillRef.current = true;

		form.reset({ topics: s.prefilledTopics });
		if (s.prefilledTsualPackageId != null) {
			setPendingTsualPackageId(s.prefilledTsualPackageId);
			setTsualSourceName(s.prefilledTsualSourceName ?? null);
			setImportedViaStructuredImport(false);
		} else {
			setPendingTsualPackageId(null);
			setTsualSourceName(null);
			setImportedViaStructuredImport(!!s.importedViaStructuredImport);
		}

		void navigate({
			to: "/packs/$packSlug/topics/bulk",
			params: { packSlug },
			replace: true,
			state: {},
		});
	}, [locationState, navigate, packSlug, form.reset]);

	const onTopicsImported = (payload: {
		topics: z.infer<typeof CreateTopicPayloadSchema>[];
		meta?: { tsualPackageId?: number; sourceLabel?: string };
	}) => {
		form.reset({ topics: payload.topics });
		if (payload.meta?.tsualPackageId != null) {
			setPendingTsualPackageId(payload.meta.tsualPackageId);
			setTsualSourceName(payload.meta.sourceLabel ?? null);
			setImportedViaStructuredImport(false);
		} else {
			setPendingTsualPackageId(null);
			setTsualSourceName(null);
			setImportedViaStructuredImport(true);
		}
	};

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "topics",
	});

	const { mutateAsync: startBulkJob, isPending: isStartingJob } = useMutation({
		...orpc.topic.startBulkCreateJob.mutationOptions(),
	});

	const onSubmit = form.handleSubmit(async (values) => {
		lastSubmittedTopicCount.current = values.topics.length;
		try {
			const { jobId } = await startBulkJob({
				pack: packSlug,
				topics: values.topics,
				...(pendingTsualPackageId != null
					? { importedFromTsualPackageId: pendingTsualPackageId }
					: {}),
				...(importedViaStructuredImport && pendingTsualPackageId == null
					? { importedViaStructuredImport: true }
					: {}),
			});
			setActiveJobId(jobId);
			setJobDialogOpen(true);
		} catch (e) {
			toastOrpcMutationFailure(
				e,
				"Could not start topic import. Please try again.",
			);
		}
	});

	const {
		Input: TopicsFormInput,
		Submit: TopicsFormSubmit,
		...formProviderState
	} = form;

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Topic rows</FrameTitle>
				<p className="text-muted-foreground text-sm">
					Each topic needs {String(QUESTIONS_PER_TOPIC)} questions. Up to{" "}
					{String(BULK_TOPICS_MAX)} per submission when adding by hand, or up to{" "}
					{String(BULK_TOPICS_MAX_TSUAL_IMPORT)} when using Import (file, URL,
					paste, or 3sual for moderators).
				</p>
				<div className="flex flex-wrap items-center gap-2 pt-1">
					<Button
						type="button"
						variant="secondary"
						size="sm"
						disabled={isStartingJob}
						onClick={() => setImportDialogOpen(true)}
					>
						<Download className="mr-1.5 size-4" />
						Import
					</Button>
					{tsualSourceName && pendingTsualPackageId != null && (
						<p className="text-muted-foreground text-xs">
							3sual pack “{tsualSourceName}” (ID {String(pendingTsualPackageId)}
							) — not saved until you create topics.
						</p>
					)}
				</div>
				{aiQuota && session?.user && (
					<p className="text-muted-foreground text-xs">
						AI generations today: {String(aiQuota.used)} /{" "}
						{String(aiQuota.limit)} (resets{" "}
						{new Date(aiQuota.resetsAt).toUTCString()} UTC) — per topic, same
						limits as on the single topic screen.
					</p>
				)}
			</FrameHeader>
			<FormProvider {...formProviderState}>
				<form className="space-y-4" onSubmit={onSubmit}>
					{fields.map((field, topicIndex) => (
						<FramePanel key={field.id} className="space-y-3">
							<div className="flex items-center justify-between gap-2">
								<p className="font-medium text-sm">Topic {topicIndex + 1}</p>
								{fields.length > 1 && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => remove(topicIndex)}
									>
										Remove topic
									</Button>
								)}
							</div>
							<TopicsFormInput name={`topics.${topicIndex}.name`} label="Name">
								{(f) => (
									<Input
										{...f}
										placeholder="Topic name"
										maxLength={100}
										autoComplete="off"
									/>
								)}
							</TopicsFormInput>
							<TopicsFormInput
								name={`topics.${topicIndex}.description`}
								label="Description"
							>
								{(f) => (
									<Textarea
										{...f}
										value={f.value || ""}
										placeholder="Optional"
										maxLength={1000}
										rows={2}
									/>
								)}
							</TopicsFormInput>

							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									disabled={
										!session?.user ||
										isStartingJob ||
										isAiPending ||
										isAiTopicPending ||
										!aiQuota ||
										aiQuota.used >= aiQuota.limit
									}
									onClick={() =>
										setAiTopicDialog({
											topicIndex,
											seed: "",
											authorPrompt: "",
										})
									}
								>
									<Wand2 className="mr-1.5 size-4" />
									{isAiTopicPending ? "Generating…" : "AI topic"}
								</Button>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									disabled={
										!session?.user ||
										isStartingJob ||
										isAiPending ||
										isAiTopicPending ||
										!aiQuota ||
										aiQuota.used >= aiQuota.limit ||
										!(form.getValues(`topics.${topicIndex}.name`)?.trim() ?? "")
									}
									onClick={() => {
										const topicName =
											form.getValues(`topics.${topicIndex}.name`)?.trim() ?? "";
										if (!topicName) {
											toast.error("Enter a name for this topic first.");
											return;
										}
										setAiAuthorDialog({ topicIndex, authorPrompt: "" });
									}}
								>
									<Sparkles className="mr-1.5 size-4" />
									{isAiPending ? "Generating…" : "Generate questions with AI"}
								</Button>
							</div>
							<p className="text-muted-foreground text-xs">
								“AI topic” fills this row’s name and description (one credit).
								“Generate questions with AI” fills its five questions (one
								credit). Verify facts before creating.
							</p>

							<BulkTopicQuestionsCarousel topicIndex={topicIndex} />
						</FramePanel>
					))}

					<FramePanel className="border-dashed">
						<Button
							type="button"
							variant="outline"
							className="w-full"
							disabled={
								fields.length >=
								(largeBatchAllowed
									? BULK_TOPICS_MAX_TSUAL_IMPORT
									: BULK_TOPICS_MAX)
							}
							onClick={() => append(emptyTopic())}
						>
							Add another topic
						</Button>
					</FramePanel>

					<FrameFooter>
						<TopicsFormSubmit
							isLoading={isStartingJob}
							loadingText="Starting import…"
						>
							Create {fields.length} topic{fields.length > 1 ? "s" : ""}
						</TopicsFormSubmit>
					</FrameFooter>
				</form>
			</FormProvider>

			<Dialog
				onOpenChange={(open) => {
					if (!open) setAiAuthorDialog(null);
				}}
				open={aiAuthorDialog !== null}
			>
				<DialogContent className="sm:max-w-lg" showCloseButton>
					<DialogHeader>
						<DialogTitle>Generate questions with AI</DialogTitle>
						<DialogDescription>
							Optional: add instructions (difficulty, tone, themes to include or
							avoid). Leave empty for the default prompt.
						</DialogDescription>
					</DialogHeader>
					<DialogPanel>
						<div className="space-y-2">
							<Label htmlFor="bulk-ai-author-prompt">
								Additional instructions
							</Label>
							<Textarea
								id="bulk-ai-author-prompt"
								maxLength={2000}
								onChange={(e) => {
									const v = e.target.value;
									setAiAuthorDialog((d) => (d ? { ...d, authorPrompt: v } : d));
								}}
								placeholder="e.g. harder clues, no sports, keep answers to one word…"
								rows={5}
								value={aiAuthorDialog?.authorPrompt ?? ""}
							/>
							<p className="text-muted-foreground text-xs">
								{aiAuthorDialog?.authorPrompt.length ?? 0}/2000 characters
							</p>
						</div>
					</DialogPanel>
					<DialogFooter>
						<Button
							onClick={() => setAiAuthorDialog(null)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={isAiPending || aiAuthorDialog == null}
							onClick={() => {
								if (aiAuthorDialog == null) return;
								const topicIndex = aiAuthorDialog.topicIndex;
								const authorPrompt =
									aiAuthorDialog.authorPrompt.trim() || undefined;
								setAiAuthorDialog(null);
								const topicName =
									form.getValues(`topics.${topicIndex}.name`)?.trim() ?? "";
								if (!topicName) {
									toast.error("Enter a name for this topic first.");
									return;
								}
								const topicDescription =
									form.getValues(`topics.${topicIndex}.description`)?.trim() ||
									undefined;
								generateWithAi(
									{
										pack: packSlug,
										topicName,
										topicDescription,
										authorPrompt,
									},
									{
										onSuccess: (data) => {
											data.questions.forEach((q, i) => {
												form.setValue(
													`topics.${topicIndex}.questions.${i}.text`,
													q.text,
												);
												form.setValue(
													`topics.${topicIndex}.questions.${i}.answer`,
													q.answer,
												);
												form.setValue(
													`topics.${topicIndex}.questions.${i}.acceptableAnswers`,
													q.acceptableAnswers ?? [],
												);
												form.setValue(
													`topics.${topicIndex}.questions.${i}.description`,
													q.description ?? "",
												);
												form.setValue(
													`topics.${topicIndex}.questions.${i}.explanation`,
													q.explanation ?? "",
												);
											});
											void queryClient.invalidateQueries({
												queryKey: orpc.topic.getAiQuota.queryKey({
													input: {},
												}),
											});
											toast.success(
												`Topic ${String(topicIndex + 1)}: AI draft added — review before saving.`,
											);
										},
										onError: (err) => {
											toastOrpcMutationFailure(
												err,
												"AI generation failed. Check GEMINI_API_KEY on the server.",
											);
										},
									},
								);
							}}
							type="button"
						>
							{isAiPending ? "Generating…" : "Generate"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				onOpenChange={(open) => {
					if (!open) setAiTopicDialog(null);
				}}
				open={aiTopicDialog !== null}
			>
				<DialogContent className="sm:max-w-lg" showCloseButton>
					<DialogHeader>
						<DialogTitle>Generate topic with AI</DialogTitle>
						<DialogDescription>
							AI proposes a topic name and a one-sentence description for this
							row. The pack’s existing topic names are passed in so the model
							avoids duplicates. Both fields are optional.
						</DialogDescription>
					</DialogHeader>
					<DialogPanel>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="bulk-ai-topic-seed">
									Seed / hint (optional)
								</Label>
								<Input
									id="bulk-ai-topic-seed"
									maxLength={200}
									onChange={(e) => {
										const v = e.target.value;
										setAiTopicDialog((d) => (d ? { ...d, seed: v } : d));
									}}
									placeholder="e.g. phonetic constraint, Cuban history…"
									value={aiTopicDialog?.seed ?? ""}
								/>
								<p className="text-muted-foreground text-xs">
									{aiTopicDialog?.seed.length ?? 0}/200 characters
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="bulk-ai-topic-author-prompt">
									Additional instructions (optional)
								</Label>
								<Textarea
									id="bulk-ai-topic-author-prompt"
									maxLength={2000}
									onChange={(e) => {
										const v = e.target.value;
										setAiTopicDialog((d) =>
											d ? { ...d, authorPrompt: v } : d,
										);
									}}
									placeholder="e.g. avoid sports topics, lean toward literature…"
									rows={4}
									value={aiTopicDialog?.authorPrompt ?? ""}
								/>
								<p className="text-muted-foreground text-xs">
									{aiTopicDialog?.authorPrompt.length ?? 0}/2000 characters
								</p>
							</div>
						</div>
					</DialogPanel>
					<DialogFooter>
						<Button
							onClick={() => setAiTopicDialog(null)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={isAiTopicPending || aiTopicDialog == null}
							onClick={() => {
								if (aiTopicDialog == null) return;
								const topicIndex = aiTopicDialog.topicIndex;
								const seed = aiTopicDialog.seed.trim() || undefined;
								const authorPrompt =
									aiTopicDialog.authorPrompt.trim() || undefined;
								setAiTopicDialog(null);
								generateTopicAi(
									{
										pack: packSlug,
										seed,
										authorPrompt,
									},
									{
										onSuccess: (data) => {
											form.setValue(`topics.${topicIndex}.name`, data.name);
											form.setValue(
												`topics.${topicIndex}.description`,
												data.description ?? "",
											);
											void queryClient.invalidateQueries({
												queryKey: orpc.topic.getAiQuota.queryKey({
													input: {},
												}),
											});
											toast.success(
												`Topic ${String(topicIndex + 1)}: AI topic added — review before saving.`,
											);
										},
										onError: (err) => {
											toastOrpcMutationFailure(
												err,
												"AI topic generation failed. Please try again.",
											);
										},
									},
								);
							}}
							type="button"
						>
							{isAiTopicPending ? "Generating…" : "Generate"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<TopicImportDialog
				canImport3sual={canImport3sual}
				onImported={onTopicsImported}
				onOpenChange={setImportDialogOpen}
				open={importDialogOpen}
			/>

			<TopicBulkJobDialog
				jobId={activeJobId}
				onCompleted={() => {
					const n = lastSubmittedTopicCount.current;
					toast.success(
						n === 1 ? "1 topic created" : `${String(n)} topics created`,
					);
					form.reset({ topics: [emptyTopic()] });
					setPendingTsualPackageId(null);
					setTsualSourceName(null);
					setImportedViaStructuredImport(false);
					setActiveJobId(null);
					setJobDialogOpen(false);
					navigate({
						to: "/packs/$packSlug",
						params: { packSlug },
						replace: true,
					});
				}}
				onOpenChange={(o) => {
					setJobDialogOpen(o);
					if (!o) {
						setActiveJobId(null);
					}
				}}
				open={jobDialogOpen}
				packSlug={packSlug}
				title="Creating topics"
				totalTopics={lastSubmittedTopicCount.current}
			/>
		</Frame>
	);
}
