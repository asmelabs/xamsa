import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
	UpdateTopicInputSchema,
	type UpdateTopicInputType,
} from "@xamsa/schemas/modules/topic";
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

interface EditTopicFormProps {
	topicData: UpdateTopicInputType;
}

export function EditTopicForm({ topicData }: EditTopicFormProps) {
	const router = useRouter();
	const { pack: packSlug, slug: topicSlug, ...initialData } = topicData;

	const form = useAppForm({
		schema: UpdateTopicInputSchema.omit({ slug: true, pack: true }),
		defaultValues: initialData,
	});

	const { mutate: updateTopic, isPending } = useMutation({
		...orpc.topic.update.mutationOptions(),
		onSuccess({ slug }) {
			form.reset();
			toast.success("Topic updated successfully");

			router.invalidate({
				filter: (r) =>
					r.pathname.startsWith("/packs/$packSlug/topics/$topicSlug/"),
			});
			router.navigate({
				to: "/packs/$packSlug/topics/$topicSlug",
				params: { packSlug, topicSlug: slug },
			});
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		updateTopic({ ...values, slug: topicSlug, pack: packSlug });
	});

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Update topic</FrameTitle>
			</FrameHeader>
			<form onSubmit={onSubmit}>
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
				</FramePanel>

				<FrameFooter>
					<form.Submit
						isLoading={isPending}
						disabled={!form.formState.isDirty}
						loadingText="Updating topic..."
					>
						Update Topic
					</form.Submit>
				</FrameFooter>
			</form>
		</Frame>
	);
}
