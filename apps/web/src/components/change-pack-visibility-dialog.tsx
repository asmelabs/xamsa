import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { PackVisibility } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { Alert, AlertDescription } from "@xamsa/ui/components/alert";
import { useCallback } from "react";
import { toast } from "sonner";
import { toastOrpcMutationFailure } from "@/lib/orpc-email-verification-error";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { LoadingButton } from "./loading-button";

type ChangePackVisibilityDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	packSlug: string;
	packName: string;
	/** The visibility to apply on confirm. */
	targetVisibility: PackVisibility;
};

export function ChangePackVisibilityDialog({
	open,
	onOpenChange,
	packSlug,
	packName,
	targetVisibility,
}: ChangePackVisibilityDialogProps) {
	const router = useRouter();
	const toPrivate = targetVisibility === "private";

	const { mutate, isPending } = useMutation({
		...orpc.pack.update.mutationOptions(),
		onSuccess() {
			toast.success(
				toPrivate
					? "Pack is now private — only you can open it from your library."
					: "Pack is now public and can appear in community listings.",
			);
			router.invalidate({
				filter: (r) => r.pathname.startsWith("/packs/"),
			});
			onOpenChange(false);
		},
		onError(error) {
			toastOrpcMutationFailure(
				error,
				"An unknown error occurred. Please try again.",
			);
		},
	});

	const setOpened = useCallback(
		(v: boolean | null | undefined) => {
			onOpenChange(!!v);
		},
		[onOpenChange],
	);

	return (
		<BetterDialog
			opened={open}
			setOpened={setOpened}
			title={toPrivate ? "Make this pack private?" : "Make this pack public?"}
			description={
				toPrivate
					? `“${packName}” will stay in your account, but it won’t be discoverable by other players the same way as public packs. You can still share the link.`
					: `“${packName}” can be listed and discovered by the community, subject to your other settings and filters.`
			}
			submit={
				<LoadingButton
					isLoading={isPending}
					loadingText="Saving…"
					type="button"
					onClick={() =>
						mutate({ slug: packSlug, visibility: targetVisibility })
					}
				>
					{toPrivate ? "Make private" : "Make public"}
				</LoadingButton>
			}
		>
			<Alert variant="default">
				<AlertDescription className="text-muted-foreground text-sm">
					{toPrivate
						? "Private packs are only visible in listings to you, unless someone has the direct link and your rules allow it."
						: "Public packs are visible in browse flows where we show community content."}
				</AlertDescription>
			</Alert>
		</BetterDialog>
	);
}
