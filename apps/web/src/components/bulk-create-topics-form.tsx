import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BULK_TOPICS_MAX } from "@xamsa/schemas/common/bulk";
import { CreateTopicPayloadSchema } from "@xamsa/schemas/modules/topic";
import { Button } from "@xamsa/ui/components/button";
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
import { Sparkles } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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

const FormSchema = z.object({
	topics: z.array(CreateTopicPayloadSchema).min(1).max(BULK_TOPICS_MAX),
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

export function BulkCreateTopicsForm({ packSlug }: BulkCreateTopicsFormProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();

	const { data: aiQuota } = useQuery({
		...orpc.topic.getAiQuota.queryOptions({ input: {} }),
		enabled: !!session?.user,
	});

	const { mutate: generateWithAi, isPending: isAiPending } = useMutation({
		...orpc.topic.generateQuestions.mutationOptions(),
	});

	const form = useAppForm({
		schema: FormSchema,
		defaultValues: {
			topics: [emptyTopic()],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "topics",
	});

	const { mutate: bulkCreate, isPending } = useMutation({
		...orpc.topic.bulkCreate.mutationOptions(),
		onSuccess({ created }) {
			toast.success(
				created.length === 1
					? "1 topic created"
					: `${String(created.length)} topics created`,
			);
			navigate({
				to: "/packs/$packSlug",
				params: { packSlug },
				replace: true,
			});
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		bulkCreate({ pack: packSlug, topics: values.topics });
	});

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Create multiple topics</FrameTitle>
				<p className="text-muted-foreground text-sm">
					Each topic needs {String(QUESTIONS_PER_TOPIC)} questions. Up to{" "}
					{String(BULK_TOPICS_MAX)} topics per submission.
				</p>
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
								variant="secondary"
								size="sm"
								disabled={
									!session?.user ||
									isPending ||
									isAiPending ||
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
									const topicDescription =
										form
											.getValues(`topics.${topicIndex}.description`)
											?.trim() || undefined;
									generateWithAi(
										{
											pack: packSlug,
											topicName,
											topicDescription,
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
														"AI generation failed. Check GROQ_API_KEY on the server.",
												);
											},
										},
									);
								}}
							>
								<Sparkles className="mr-1.5 size-4" />
								{isAiPending ? "Generating…" : "Generate with AI"}
							</Button>
						</div>
						<p className="text-muted-foreground text-xs">
							Each click uses one daily AI credit and fills that topic’s five
							questions; verify facts before creating.
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
						disabled={fields.length >= BULK_TOPICS_MAX}
						onClick={() => append(emptyTopic())}
					>
						Add another topic
					</Button>
				</FramePanel>

				<FrameFooter>
					<form.Submit isLoading={isPending} loadingText="Creating topics...">
						Create {fields.length} topic{fields.length > 1 ? "s" : ""}
					</form.Submit>
				</FrameFooter>
			</form>
		</Frame>
	);
}
