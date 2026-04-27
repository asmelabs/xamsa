import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	BULK_TOPICS_MAX,
	BULK_TOPICS_MAX_TSUAL_IMPORT,
} from "@xamsa/schemas/common/bulk";
import { CreateTopicPayloadSchema } from "@xamsa/schemas/modules/topic";
import { Button } from "@xamsa/ui/components/button";
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
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "@xamsa/ui/components/popover";
import { Textarea } from "@xamsa/ui/components/textarea";
import { QUESTIONS_PER_TOPIC } from "@xamsa/utils/constants";
import { CircleHelp, Download, Sparkles, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { TopicBulkJobDialog } from "./topic-bulk-job-dialog";

const emptyQuestion = {
	text: "",
	answer: "",
	acceptableAnswers: [] as string[],
	description: "",
	explanation: "",
};

const FormSchema = z.object({
	topics: z
		.array(CreateTopicPayloadSchema)
		.min(1)
		.max(BULK_TOPICS_MAX_TSUAL_IMPORT),
});

type FormValues = z.infer<typeof FormSchema>;

function emptyTopic(): FormValues["topics"][number] {
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

export function BulkCreateTopicsForm({ packSlug }: BulkCreateTopicsFormProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const canImport3sual = isModeratorOrAdmin(session?.user);

	const [tsualDialogOpen, setTsualDialogOpen] = useState(false);
	const [tsualRaw, setTsualRaw] = useState("");
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

	const form = useAppForm({
		schema: FormSchema,
		defaultValues: {
			topics: [emptyTopic()],
		},
	});

	const { mutate: previewTsualImport, isPending: isTsualPending } = useMutation(
		{
			...orpc.tsual.previewImport.mutationOptions(),
			onSuccess: (data) => {
				if (data.topics.length > BULK_TOPICS_MAX_TSUAL_IMPORT) {
					toast.error(
						`This package has more than ${String(BULK_TOPICS_MAX_TSUAL_IMPORT)} topics; cannot load.`,
					);
					return;
				}
				form.reset({ topics: data.topics });
				setPendingTsualPackageId(data.tsualPackageId);
				setTsualSourceName(data.sourceName);
				setTsualDialogOpen(false);
				setTsualRaw("");
				toast.success(
					"3sual draft loaded — review and edit, then create topics.",
				);
			},
			onError: (error) => {
				toast.error(error.message || "3sual import failed.");
			},
		},
	);

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
			});
			setActiveJobId(jobId);
			setJobDialogOpen(true);
		} catch (e) {
			const err = e as { message?: string };
			toast.error(
				err.message || "Could not start topic import. Please try again.",
			);
		}
	});

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Topic rows</FrameTitle>
				<p className="text-muted-foreground text-sm">
					Each topic needs {String(QUESTIONS_PER_TOPIC)} questions. Up to{" "}
					{String(BULK_TOPICS_MAX)} per submission when adding by hand, or up to{" "}
					{String(BULK_TOPICS_MAX_TSUAL_IMPORT)} when using Import from 3sual.
				</p>
				{canImport3sual && (
					<div className="flex flex-wrap items-center gap-2 pt-1">
						<Button
							type="button"
							variant="secondary"
							size="sm"
							disabled={isStartingJob || isTsualPending}
							onClick={() => setTsualDialogOpen(true)}
						>
							<Download className="mr-1.5 size-4" />
							Import from 3sual
						</Button>
						{tsualSourceName && pendingTsualPackageId != null && (
							<p className="text-muted-foreground text-xs">
								3sual pack “{tsualSourceName}” (ID{" "}
								{String(pendingTsualPackageId)}) — not saved until you create
								topics.
							</p>
						)}
					</div>
				)}
				{aiQuota && session?.user && (
					<p className="text-muted-foreground text-xs">
						AI generations today: {String(aiQuota.used)} /{" "}
						{String(aiQuota.limit)} (resets{" "}
						{new Date(aiQuota.resetsAt).toUTCString()} UTC) — per topic, same
						limits as on the single topic screen.
					</p>
				)}
			</FrameHeader>
			<form onSubmit={onSubmit} className="space-y-6">
				{fields.map((field, topicIndex) => (
					<FramePanel key={field.id} className="space-y-4">
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
						<form.Input name={`topics.${topicIndex}.name`} label="Name">
							{(f) => (
								<Input
									{...f}
									placeholder="Topic name"
									maxLength={100}
									autoComplete="off"
								/>
							)}
						</form.Input>
						<form.Input
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
						</form.Input>

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

						<div className="space-y-3">
							<p className="text-muted-foreground text-xs">Questions</p>
							{Array.from({ length: QUESTIONS_PER_TOPIC }, (_, qIndex) => (
								<div
									key={qIndex}
									className="space-y-2 rounded-lg border bg-muted/30 p-3"
								>
									<p className="font-medium text-xs">Question {qIndex + 1}</p>
									<form.Input
										name={`topics.${topicIndex}.questions.${qIndex}.text`}
										label="Text"
									>
										{(f) => (
											<Textarea
												{...f}
												placeholder="Clue / question"
												maxLength={1000}
												rows={2}
											/>
										)}
									</form.Input>
									<form.Input
										name={`topics.${topicIndex}.questions.${qIndex}.answer`}
										label="Answer"
									>
										{(f) => (
											<Input
												{...f}
												placeholder="Primary answer"
												maxLength={250}
											/>
										)}
									</form.Input>
									<form.Input
										name={`topics.${topicIndex}.questions.${qIndex}.explanation`}
										label="Explanation (optional)"
									>
										{(f) => (
											<Textarea
												{...f}
												value={f.value || ""}
												rows={1}
												maxLength={1000}
											/>
										)}
									</form.Input>
								</div>
							))}
						</div>
					</FramePanel>
				))}

				<FramePanel className="border-dashed">
					<Button
						type="button"
						variant="outline"
						className="w-full"
						disabled={fields.length >= BULK_TOPICS_MAX_TSUAL_IMPORT}
						onClick={() => append(emptyTopic())}
					>
						Add another topic
					</Button>
				</FramePanel>

				<FrameFooter>
					<form.Submit isLoading={isStartingJob} loadingText="Starting import…">
						Create {fields.length} topic{fields.length > 1 ? "s" : ""}
					</form.Submit>
				</FrameFooter>
			</form>

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
											toast.error(
												err.message ||
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
											toast.error(
												err.message ||
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

			<Dialog onOpenChange={setTsualDialogOpen} open={tsualDialogOpen}>
				<DialogContent className="sm:max-w-md" showCloseButton>
					<DialogHeader>
						<div className="flex items-center gap-1">
							<DialogTitle>Import from 3sual.az</DialogTitle>
							<Popover>
								<PopoverTrigger
									aria-label="How to get package id"
									className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
									type="button"
								>
									<CircleHelp className="size-4" />
								</PopoverTrigger>
								<PopoverPopup align="start" className="max-w-sm" side="bottom">
									<div className="space-y-2 text-muted-foreground text-sm">
										<p>
											Open a package on 3sual.az for <strong>Fərdi Oyun</strong>{" "}
											or <strong>Xəmsə Milli İntellektual Oyunu</strong> (other
											game types are not supported).
										</p>
										<p>
											Copy the number from the URL bar, for example{" "}
											<code className="text-foreground text-xs">
												https://3sual.az/package/3946
											</code>{" "}
											→ use <strong>3946</strong>, or paste the full URL in the
											field.
										</p>
									</div>
								</PopoverPopup>
							</Popover>
						</div>
						<DialogDescription>
							Loads a preview into this form. Nothing is saved until you click
							Create.
						</DialogDescription>
					</DialogHeader>
					<DialogPanel>
						<div className="space-y-2">
							<label className="font-medium text-sm" htmlFor="tsual-raw">
								Package ID or 3sual URL
							</label>
							<Input
								autoComplete="off"
								id="tsual-raw"
								onChange={(e) => setTsualRaw(e.target.value)}
								placeholder="3946 or https://3sual.az/package/3946"
								value={tsualRaw}
							/>
						</div>
					</DialogPanel>
					<DialogFooter>
						<Button
							onClick={() => setTsualDialogOpen(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={!tsualRaw.trim() || isTsualPending}
							onClick={() => previewTsualImport({ raw: tsualRaw })}
							type="button"
						>
							{isTsualPending ? "Loading…" : "Load preview"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

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
