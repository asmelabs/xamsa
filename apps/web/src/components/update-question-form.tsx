import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
	UpdateQuestionInputSchema,
	type UpdateQuestionInputType,
} from "@xamsa/schemas/modules/question";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { Textarea } from "@xamsa/ui/components/textarea";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { orpc } from "@/utils/orpc";

interface UpdateQuestionFormProps {
	questionData: UpdateQuestionInputType;
}

export function UpdateQuestionForm({ questionData }: UpdateQuestionFormProps) {
	const {
		slug: questionSlug,
		pack: packSlug,
		topic: topicSlug,
		...initialData
	} = questionData;

	const router = useRouter();

	const form = useAppForm({
		schema: UpdateQuestionInputSchema.omit({
			slug: true,
			pack: true,
			topic: true,
		}),
		defaultValues: initialData,
	});

	const { mutate: updateQuestion, isPending } = useMutation({
		...orpc.question.update.mutationOptions(),
		onSuccess({ slug }) {
			form.reset();
			toast.success("Question updated successfully");
			router.invalidate({
				filter: (r) =>
					r.pathname.startsWith(
						"/packs/$packSlug/topics/$topicSlug/questions/$questionSlug/",
					),
			});
			router.navigate({
				to: "/packs/$packSlug/topics/$topicSlug/questions/$questionSlug",
				params: { packSlug, topicSlug, questionSlug: slug },
			});
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		updateQuestion({
			...values,
			slug: questionSlug,
			pack: packSlug,
			topic: topicSlug,
		});
	});

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Question content</FrameTitle>
			</FrameHeader>
			<form onSubmit={onSubmit}>
				<FramePanel className="space-y-4">
					<form.Input name="text" label="Text">
						{(field) => (
							<Textarea
								{...field}
								value={field.value || ""}
								placeholder="Enter your question text"
								maxLength={1000}
								rows={3}
								className="resize-none"
							/>
						)}
					</form.Input>
					<form.Input name="answer" label="Answer">
						{(field) => (
							<Input
								{...field}
								placeholder="Enter your question answer"
								maxLength={250}
							/>
						)}
					</form.Input>
					<form.Input name="explanation" label="Explanation">
						{(field) => (
							<Textarea
								{...field}
								value={field.value || ""}
								placeholder="Optional note about the answer for the host"
								maxLength={1000}
								rows={2}
								className="resize-none"
							/>
						)}
					</form.Input>
				</FramePanel>

				<FrameFooter>
					<form.Submit
						isLoading={isPending}
						disabled={!form.formState.isDirty}
						loadingText="Updating question..."
					>
						Update Question
					</form.Submit>
				</FrameFooter>
			</form>
		</Frame>
	);
}
