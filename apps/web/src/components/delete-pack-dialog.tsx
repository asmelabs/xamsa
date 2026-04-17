import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Input } from "@xamsa/ui/components/input";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { LoadingButton } from "./loading-button";

interface DeletePackDialogProps {
	packSlug: string;
	packName: string;
}
export function DeletePackDialog({
	packSlug,
	packName,
}: DeletePackDialogProps) {
	const router = useRouter();

	const [confirmName, setConfirmName] = useState("");
	const [deletePackOpen, setDeletePackOpen] = useQueryState(
		"delete-pack-open",
		parseAsBoolean.withDefault(false),
	);

	const canDelete = confirmName.trim() === packName.trim();

	const { mutate: deletePack, isPending } = useMutation({
		...orpc.pack.delete.mutationOptions(),
		onSuccess() {
			toast.success("Pack deleted successfully");
			router.invalidate({
				filter: (r) => r.pathname.startsWith("/packs/$packSlug/"),
			});
			router.navigate({ to: "/packs" });
			setDeletePackOpen(null);
		},
		onError(error) {
			toast.error(
				error.message || "An unknown error occurred. Please try again.",
			);
		},
	});

	return (
		<BetterDialog
			opened={deletePackOpen}
			setOpened={(open) => setDeletePackOpen(open ?? false)}
			title="Delete this pack"
			description="This action is permanent and cannot be undone. All topics, questions, and game history associated with this pack will be lost."
			panelClassName="space-y-4"
			submit={
				<LoadingButton
					type="button"
					variant="destructive"
					onClick={() => deletePack({ slug: packSlug, name: confirmName })}
					isLoading={isPending}
					loadingText="Deleting..."
					disabled={!canDelete}
				>
					I understand, delete this pack
				</LoadingButton>
			}
		>
			<div className="space-y-3">
				<div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
					<p className="text-destructive-foreground text-sm">
						This will permanently delete the{" "}
						<span className="select-none font-semibold">{packName}</span> pack,
						along with all of its topics and questions.
					</p>
				</div>
				<div className="space-y-2">
					<label
						htmlFor="confirm-pack-name"
						className="text-muted-foreground text-sm"
					>
						To confirm, type{" "}
						<span className="select-none font-semibold text-foreground">
							{packName}
						</span>{" "}
						below:
					</label>
					<Input
						id="confirm-pack-name"
						placeholder={packName}
						value={confirmName}
						onChange={(e) => setConfirmName(e.target.value)}
						autoComplete="off"
						spellCheck={false}
					/>
				</div>
			</div>
		</BetterDialog>
	);
}
