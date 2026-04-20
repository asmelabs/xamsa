import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { PackLanguageSchema } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import { PackVisibilitySchema } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { CreatePackInputSchema } from "@xamsa/schemas/modules/pack";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import { Textarea } from "@xamsa/ui/components/textarea";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { orpc } from "@/utils/orpc";

export function CreatePackForm() {
	const navigate = useNavigate();

	const [defaultName] = useQueryState("name");
	const [defaultDescription] = useQueryState("description");
	const [defaultLanguage] = useQueryState(
		"language",
		parseAsStringLiteral(PackLanguageSchema.options).withDefault("az"),
	);
	const [defaultVisibility] = useQueryState(
		"visibility",
		parseAsStringLiteral(PackVisibilitySchema.options).withDefault("public"),
	);

	const form = useAppForm({
		schema: CreatePackInputSchema,
		defaultValues: {
			name: defaultName || "",
			description: defaultDescription || "",
			language: defaultLanguage,
			visibility: defaultVisibility,
		},
	});

	const { mutate: createPack, isPending } = useMutation({
		...orpc.pack.create.mutationOptions(),
		onSuccess({ slug }) {
			form.reset();
			toast.success("Pack created successfully");
			navigate({ to: `/packs/${slug}/topics/new`, replace: true });
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		createPack(values);
	});

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Create a new pack</FrameTitle>
			</FrameHeader>
			<form onSubmit={onSubmit}>
				<FramePanel className="space-y-4">
					<form.Input
						name="name"
						label="Name"
						description="You will not be able to change the name later, so choose wisely."
					>
						{(field) => (
							<Input
								{...field}
								placeholder="Enter your pack name"
								maxLength={100}
							/>
						)}
					</form.Input>
					<form.Input name="description" label="Description">
						{(field) => (
							<Textarea
								{...field}
								value={field.value || ""}
								placeholder="Enter your pack description"
								maxLength={1000}
							/>
						)}
					</form.Input>
				</FramePanel>

				<FrameFooter>
					<form.Submit isLoading={isPending} loadingText="Creating pack...">
						Create Pack
					</form.Submit>
				</FrameFooter>
			</form>
		</Frame>
	);
}
