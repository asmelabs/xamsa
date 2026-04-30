import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@xamsa/ui/components/button";
import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { LoadingButton } from "./loading-button";

type DeleteTopicDialogProps = {
	packSlug: string;
	topicSlug: string;
	topicName: string;
	/** Called after the topic is removed (e.g. navigate away from the topic page). */
	onDeleted?: () => void;
	/** @default "outline" */
	triggerVariant?: "outline" | "ghost" | "destructive";
	/** @default "sm" */
	triggerSize?: "default" | "sm" | "icon";
	/** @default true — set false for icon-only triggers */
	showLabel?: boolean;
	className?: string;
};

/**
 * Author-only, draft pack: deletes the topic and compacts `order` for siblings on the server.
 */
export function DeleteTopicDialog({
	packSlug,
	topicSlug,
	topicName,
	onDeleted,
	triggerVariant = "outline",
	triggerSize = "sm",
	showLabel = true,
	className,
}: DeleteTopicDialogProps) {
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const router = useRouter();

	const { mutate, isPending } = useMutation({
		...orpc.topic.delete.mutationOptions(),
		onSuccess: async () => {
			toast.success("Topic deleted");
			setOpen(false);
			await queryClient.invalidateQueries({
				queryKey: orpc.pack.findOne.queryKey({ input: { slug: packSlug } }),
			});
			await queryClient.invalidateQueries({
				predicate: (q) => {
					const flat = JSON.stringify(q.queryKey);
					return flat.includes(packSlug) && flat.includes("list");
				},
			});
			await router.invalidate({
				filter: (r) => r.pathname.startsWith(`/packs/${packSlug}/`),
			});
			onDeleted?.();
		},
		onError(error) {
			toastOrpcMutationFailure(
				error,
				"Could not delete this topic. Try again.",
			);
		},
	});

	return (
		<>
			<Button
				type="button"
				variant={triggerVariant}
				size={triggerSize}
				className={className}
				onClick={() => setOpen(true)}
				aria-label={`Delete topic ${topicName}`}
			>
				<Trash2Icon />
				{showLabel && triggerSize !== "icon" ? "Delete" : null}
			</Button>
			<BetterDialog
				opened={open}
				setOpened={(o) => setOpen(o ?? false)}
				title="Delete this topic?"
				description="This removes the topic and all of its questions. Remaining topics are reordered so there are no gaps. You cannot undo this."
				panelClassName="space-y-4"
				submit={
					<LoadingButton
						type="button"
						variant="destructive"
						onClick={() =>
							mutate({
								pack: packSlug,
								slug: topicSlug,
								name: topicName,
							})
						}
						isLoading={isPending}
						loadingText="Deleting…"
					>
						Delete topic
					</LoadingButton>
				}
			>
				<div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
					<p className="text-destructive-foreground text-sm">
						<span className="font-semibold">{topicName}</span> will be
						permanently removed from this pack.
					</p>
				</div>
			</BetterDialog>
		</>
	);
}
