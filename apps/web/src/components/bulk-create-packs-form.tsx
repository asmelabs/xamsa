import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { BULK_PACKS_MAX } from "@xamsa/schemas/common/bulk";
import { PackLanguageSchema } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import { PackVisibilitySchema } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { CreatePackInputSchema } from "@xamsa/schemas/modules/pack";
import { Button } from "@xamsa/ui/components/button";
import {
	Frame,
	FrameFooter,
	FrameHeader,
	FramePanel,
	FrameTitle,
} from "@xamsa/ui/components/frame";
import { Input } from "@xamsa/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { Textarea } from "@xamsa/ui/components/textarea";
import { formatCase, formattedEnum } from "@xamsa/utils/case-formatters";
import { useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAppForm } from "@/hooks/use-app-form";
import { orpc } from "@/utils/orpc";

const FormSchema = z.object({
	packs: z.array(CreatePackInputSchema).min(1).max(BULK_PACKS_MAX),
});

type FormValues = z.infer<typeof FormSchema>;

const defaultPack: FormValues["packs"][number] = {
	name: "",
	description: "",
	language: "az",
	visibility: "public",
};

export function BulkCreatePacksForm() {
	const navigate = useNavigate();

	const form = useAppForm({
		schema: FormSchema,
		defaultValues: {
			packs: [{ ...defaultPack }],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "packs",
	});

	const { mutate: bulkCreate, isPending } = useMutation({
		...orpc.pack.bulkCreate.mutationOptions(),
		onSuccess({ created }) {
			toast.success(
				created.length === 1
					? "1 pack created"
					: `${String(created.length)} packs created`,
			);
			if (created.length === 1) {
				const first = created[0];
				if (first) {
					navigate({
						to: "/packs/$packSlug/topics/new",
						params: { packSlug: first.slug },
						replace: true,
					});
				}
				return;
			}
			navigate({ to: "/packs", replace: true });
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	const onSubmit = form.handleSubmit((values) => {
		bulkCreate({ packs: values.packs });
	});

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Draft rows</FrameTitle>
				<p className="text-muted-foreground text-sm">
					All packs are created as drafts. You can add up to{" "}
					{String(BULK_PACKS_MAX)} in one go.
				</p>
			</FrameHeader>
			<form onSubmit={onSubmit} className="space-y-4">
				{fields.map((field, index) => (
					<FramePanel key={field.id} className="space-y-3">
						<div className="flex items-center justify-between gap-2">
							<p className="font-medium text-sm">Pack {index + 1}</p>
							{fields.length > 1 && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => remove(index)}
								>
									Remove
								</Button>
							)}
						</div>
						<form.Input name={`packs.${index}.name`} label="Name">
							{(f) => (
								<Input
									{...f}
									placeholder="Pack name"
									maxLength={100}
									autoComplete="off"
								/>
							)}
						</form.Input>
						<form.Input name={`packs.${index}.description`} label="Description">
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
						<div className="grid gap-3 sm:grid-cols-2">
							<form.Input name={`packs.${index}.language`} label="Language">
								{(f) => (
									<Select value={f.value as string} onValueChange={f.onChange}>
										<SelectTrigger>
											<SelectValue
												placeholder="Language"
												aria-label="Pack language"
											>
												{formatCase(f.value as string, "snake", "title") ||
													"Language"}
											</SelectValue>
										</SelectTrigger>
										<SelectContent>
											{formattedEnum(PackLanguageSchema.options).map(
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
							<form.Input name={`packs.${index}.visibility`} label="Visibility">
								{(f) => (
									<Select value={f.value as string} onValueChange={f.onChange}>
										<SelectTrigger>
											<SelectValue
												placeholder="Visibility"
												aria-label="Pack visibility"
											>
												{formatCase(f.value as string, "snake", "title") ||
													"Visibility"}
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
					</FramePanel>
				))}

				<FramePanel className="border-dashed">
					<Button
						type="button"
						variant="outline"
						className="w-full"
						disabled={fields.length >= BULK_PACKS_MAX}
						onClick={() => append({ ...defaultPack })}
					>
						Add another pack
					</Button>
				</FramePanel>

				<FrameFooter>
					<form.Submit isLoading={isPending} loadingText="Creating packs...">
						Create {fields.length} pack{fields.length > 1 ? "s" : ""}
					</form.Submit>
				</FrameFooter>
			</form>
		</Frame>
	);
}
