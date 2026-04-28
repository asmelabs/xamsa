import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { PackLanguageSchema } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import { PackVisibilitySchema } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import {
	UpdatePackInputSchema,
	type UpdatePackInputType,
} from "@xamsa/schemas/modules/pack";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { Switch } from "@xamsa/ui/components/switch";
import { Textarea } from "@xamsa/ui/components/textarea";
import { formatCase, formattedEnum } from "@xamsa/utils/case-formatters";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { orpc } from "@/utils/orpc";

interface EditPackFormProps {
	packData: UpdatePackInputType;
}

export function EditPackForm({ packData }: EditPackFormProps) {
	const router = useRouter();
	const { slug: packSlug, ...initialData } = packData;

	const form = useAppForm({
		schema: UpdatePackInputSchema.omit({ slug: true }),
		defaultValues: initialData,
	});

	const visibility = form.watch("visibility");

	const { mutate: updatePack, isPending } = useMutation({
		...orpc.pack.update.mutationOptions(),
		onSuccess({ slug }) {
			form.reset();
			toast.success("Pack updated successfully");

			router.invalidate({
				filter: (r) => r.pathname.startsWith("/packs/$packSlug/"),
			});
			router.navigate({
				to: "/packs/$packSlug",
				params: { packSlug: slug },
			});
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		updatePack({ ...values, slug: packSlug });
	});

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Description and visibility</FrameTitle>
			</FrameHeader>
			<form onSubmit={onSubmit}>
				<FramePanel className="space-y-4">
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

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Input name="language" label="Language">
							{(field) => (
								<Select
									value={field.value || ""}
									onValueChange={field.onChange}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select language">
											{formatCase(field.value || "", "snake", "title") ||
												"Select language"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{formattedEnum(PackLanguageSchema.options).map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</form.Input>
						<form.Input name="visibility" label="Visibility">
							{(field) => (
								<Select
									value={field.value || ""}
									onValueChange={field.onChange}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select visibility">
											{formatCase(field.value || "", "snake", "title") ||
												"Select visibility"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{formattedEnum(PackVisibilitySchema.options).map(
											(option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							)}
						</form.Input>
					</div>

					<form.Input
						name="allowOthersHost"
						label="Community hosting"
						description="When this pack is published and public, other signed-in players can host live games from it—not only you."
					>
						{(field) => (
							<div className="flex items-start gap-3">
								<Switch
									checked={field.value ?? false}
									disabled={visibility === "private"}
									id="edit-pack-allow-others-host"
									onCheckedChange={field.onChange}
								/>
								<label
									className="text-muted-foreground text-sm leading-snug"
									htmlFor="edit-pack-allow-others-host"
								>
									Allow others to host games with this pack
									{visibility === "private" ? (
										<span className="mt-1 block text-xs">
											Only public packs can use community hosting.
										</span>
									) : null}
								</label>
							</div>
						)}
					</form.Input>
				</FramePanel>

				<FrameFooter>
					<form.Submit
						isLoading={isPending}
						disabled={!form.formState.isDirty}
						loadingText="Updating pack..."
					>
						Update Pack
					</form.Submit>
				</FrameFooter>
			</form>
		</Frame>
	);
}
