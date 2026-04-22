import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BULK_TOPICS_MAX_TSUAL_IMPORT } from "@xamsa/schemas/common/bulk";
import { PackLanguageSchema } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import { PackVisibilitySchema } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { CreatePackInputSchema } from "@xamsa/schemas/modules/pack";
import type { CreateTopicPayloadType } from "@xamsa/schemas/modules/topic";
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
import {
	Popover,
	PopoverPopup,
	PopoverTrigger,
} from "@xamsa/ui/components/popover";
import { Textarea } from "@xamsa/ui/components/textarea";
import { CircleHelp, Download } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

function isModeratorOrAdmin(
	user: { role?: string } | undefined,
): user is { role: "moderator" | "admin" } {
	const r = user?.role;
	return r === "moderator" || r === "admin";
}

export function CreatePackForm() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const canImport3sual = isModeratorOrAdmin(session?.user);

	const [tsualDialogOpen, setTsualDialogOpen] = useState(false);
	const [tsualRaw, setTsualRaw] = useState("");
	const [pendingTsualPackageId, setPendingTsualPackageId] = useState<
		number | null
	>(null);
	const [tsualSourceName, setTsualSourceName] = useState<string | null>(null);
	const [pendingTsualTopics, setPendingTsualTopics] = useState<
		CreateTopicPayloadType[] | null
	>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

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

	const { mutateAsync: createPackAsync, isPending: isCreatePending } =
		useMutation({
			...orpc.pack.create.mutationOptions(),
		});

	const { mutateAsync: bulkCreateAsync, isPending: isBulkPending } =
		useMutation({
			...orpc.topic.bulkCreate.mutationOptions(),
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
				setPendingTsualTopics(data.topics);
				setPendingTsualPackageId(data.tsualPackageId);
				setTsualSourceName(data.sourceName);
				setTsualDialogOpen(false);
				setTsualRaw("");
				toast.success(
					"3sual preview ready — it will be saved when you create the pack.",
				);
			},
			onError: (error) => {
				toast.error(error.message || "3sual import failed.");
			},
		},
	);

	const onSubmit = form.handleSubmit(async (values) => {
		const topicsToImport = pendingTsualTopics;
		const tsualId = pendingTsualPackageId;
		const withTsual = topicsToImport != null && tsualId != null;

		setIsSubmitting(true);
		try {
			const { slug } = await createPackAsync(values);
			if (withTsual) {
				await bulkCreateAsync({
					pack: slug,
					topics: topicsToImport,
					importedFromTsualPackageId: tsualId,
				});
				toast.success("Pack created with topics from 3sual.");
			} else {
				toast.success("Pack created successfully");
			}
			form.reset();
			setPendingTsualTopics(null);
			setPendingTsualPackageId(null);
			setTsualSourceName(null);
			if (withTsual) {
				navigate({
					to: "/packs/$packSlug",
					params: { packSlug: slug },
					replace: true,
				});
			} else {
				navigate({ to: `/packs/${slug}/topics/new`, replace: true });
			}
		} catch (error) {
			const err = error as { message?: string };
			toast.error(
				err.message || "An unknown error occurred. Please try again.",
			);
		} finally {
			setIsSubmitting(false);
		}
	});

	const loading = isCreatePending || isBulkPending || isSubmitting;

	return (
		<Frame>
			<FrameHeader>
				<FrameTitle>Create a new pack</FrameTitle>
				<p className="text-muted-foreground text-sm">
					Want several draft packs?{" "}
					<Link className="text-primary underline" to="/packs/bulk-new">
						Create multiple packs at once
					</Link>
					.
				</p>
				{canImport3sual && (
					<div className="flex flex-wrap items-center gap-2 pt-1">
						<Button
							disabled={loading || isTsualPending}
							onClick={() => setTsualDialogOpen(true)}
							type="button"
							variant="secondary"
						>
							<Download className="mr-1.5 size-4" />
							Import from 3sual
						</Button>
						{tsualSourceName && pendingTsualPackageId != null && (
							<p className="text-muted-foreground text-xs">
								3sual pack “{tsualSourceName}” (ID{" "}
								{String(pendingTsualPackageId)}) —{" "}
								{String(pendingTsualTopics?.length ?? 0)} topic
								{(pendingTsualTopics?.length ?? 0) === 1 ? "" : "s"} will be
								added when you create the pack.
							</p>
						)}
					</div>
				)}
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
					<form.Submit isLoading={loading} loadingText="Creating pack...">
						{pendingTsualTopics && pendingTsualPackageId != null
							? "Create pack & add topics"
							: "Create Pack"}
					</form.Submit>
				</FrameFooter>
			</form>

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
							Load a topic preview, then use Create pack — the pack and topics
							are created together in one step.
						</DialogDescription>
					</DialogHeader>
					<DialogPanel>
						<div className="space-y-2">
							<label
								className="font-medium text-sm"
								htmlFor="create-pack-tsual-raw"
							>
								Package ID or 3sual URL
							</label>
							<Input
								autoComplete="off"
								id="create-pack-tsual-raw"
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
		</Frame>
	);
}
