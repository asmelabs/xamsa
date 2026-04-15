import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CreateTopicInputSchema } from "@xamsa/schemas/modules/topic";
import { Button } from "@xamsa/ui/components/button";
import {
	Card,
	CardHeader,
	CardPanel,
	CardTitle,
} from "@xamsa/ui/components/card";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { Textarea } from "@xamsa/ui/components/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect } from "react";
import { useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { orpc } from "@/utils/orpc";

const MAX_QUESTIONS = 5;

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

	const [defaultName] = useQueryState("name");
	const [defaultDescription] = useQueryState("description");

	const form = useAppForm({
		schema: CreateTopicInputSchema.omit({ pack: true }),
		defaultValues: {
			name: defaultName || "",
			description: defaultDescription || "",
			questions: [] as (typeof emptyQuestion)[],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "questions",
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

	const onSubmit = form.handleSubmit(
		async (values) => {
			createTopic({ ...values, pack: packSlug });
		},
		(e) => {
			console.warn(e);

			if (e.questions) {
				return toast.error(e.questions.message);
			}
		},
	);

	const canAddMore = fields.length < MAX_QUESTIONS;
	const remaining = MAX_QUESTIONS - fields.length;

	useEffect(() => {
		if (form.formState.errors.questions?.root?.message) {
			toast.error(form.formState.errors.questions?.root?.message);
		}
	}, [form.formState.errors.questions?.root?.message]);

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Create a new topic</FrameTitle>
			</FrameHeader>
			<form onSubmit={onSubmit} className="space-y-4">
				<FramePanel className="space-y-4">
					<form.Input
						name="name"
						label="Name"
						description="You will not be able to change the name later, so choose wisely."
					>
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
				</FramePanel>

				<FramePanel className="space-y-3">
					<div className="flex items-center justify-between">
						<p className="font-semibold text-sm">
							Questions{" "}
							<span className="font-normal text-muted-foreground">
								({fields.length}/{MAX_QUESTIONS})
							</span>
						</p>
						{canAddMore && (
							<Button
								variant="outline"
								size="sm"
								type="button"
								onClick={() => append(emptyQuestion)}
							>
								<Plus />
								Add
							</Button>
						)}
					</div>

					{fields.length === 0 && (
						<button
							type="button"
							onClick={() => append(emptyQuestion)}
							className="flex w-full flex-col items-center gap-2 rounded-xl border border-border border-dashed py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
						>
							<Plus className="size-5" />
							<span className="text-sm">
								Add your first question ({remaining} required)
							</span>
						</button>
					)}
					{fields.map((field, index) => (
						<Card key={field.id}>
							<CardHeader className="flex flex-row items-center justify-between py-3">
								<CardTitle className="text-sm">Question {index + 1}</CardTitle>
								<Button
									variant="ghost"
									size="icon-xs"
									type="button"
									onClick={() => remove(index)}
								>
									<Trash2 />
								</Button>
							</CardHeader>
							<CardPanel className="space-y-3 pt-0">
								<form.Input name={`questions.${index}.text`} label="Text">
									{(f) => (
										<Textarea
											{...f}
											placeholder="Enter question text"
											maxLength={1000}
											rows={2}
										/>
									)}
								</form.Input>
								<form.Input name={`questions.${index}.answer`} label="Answer">
									{(f) => (
										<Input
											{...f}
											placeholder="Enter the correct answer"
											maxLength={250}
										/>
									)}
								</form.Input>
							</CardPanel>
						</Card>
					))}
					{fields.length > 0 && canAddMore && (
						<p className="text-center text-muted-foreground text-xs">
							{remaining} more question{remaining !== 1 && "s"} needed
						</p>
					)}
				</FramePanel>

				<FrameFooter>
					<form.Submit isLoading={isPending} loadingText="Creating topic...">
						Create Topic
					</form.Submit>
				</FrameFooter>
			</form>
		</Frame>
	);
}
