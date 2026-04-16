import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import type { PackVisibility } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { Button } from "@xamsa/ui/components/button";
import { Input } from "@xamsa/ui/components/input";
import {
	Menu,
	MenuGroup,
	MenuGroupLabel,
	MenuItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "@xamsa/ui/components/menu";
import {
	EllipsisIcon,
	ExternalLinkIcon,
	GlobeIcon,
	LinkIcon,
	LockIcon,
	PencilIcon,
	PlusIcon,
	TrashIcon,
} from "lucide-react";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { orpc } from "@/utils/orpc";
import { BetterDialog } from "./better-dialog";
import { LoadingButton } from "./loading-button";

interface PackActionsMenuProps {
	packSlug: string;
	packName: string;
	visibility: PackVisibility;
	status: PackStatus;
}

export function PackActionsMenu({
	packSlug,
	packName,
	visibility,
	status,
}: PackActionsMenuProps) {
	const router = useRouter();
	const { copy } = useCopyToClipboard();

	const [deletePackOpen, setDeletePackOpen] = useQueryState("delete-pack-open");
	const [confirmName, setConfirmName] = useState("");

	const isPrivate = visibility === "private";
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

	const handleCopyLink = () => {
		copy(`${window.location.origin}/packs/${packSlug}`);
		toast.success("Link copied to clipboard");
	};

	return (
		<>
			<Menu>
				<MenuTrigger render={<Button variant="outline" size="icon" />}>
					<EllipsisIcon />
				</MenuTrigger>
				<MenuPopup align="end" sideOffset={6}>
					<MenuGroup>
						<MenuGroupLabel>Edit</MenuGroupLabel>
						<MenuItem
							render={<Link to="/packs/$packSlug/edit" params={{ packSlug }} />}
						>
							<PencilIcon />
							Edit pack details
						</MenuItem>
						<MenuItem>
							{isPrivate ? <GlobeIcon /> : <LockIcon />}
							{isPrivate ? "Make public" : "Make private"}
						</MenuItem>
						{status === "draft" && (
							<MenuItem
								render={
									<Link
										to="/packs/$packSlug/topics/new"
										params={{ packSlug }}
									/>
								}
							>
								<PlusIcon />
								Add a new topic
							</MenuItem>
						)}
					</MenuGroup>

					<MenuSeparator />

					<MenuGroup>
						<MenuGroupLabel>Share</MenuGroupLabel>
						<MenuItem onClick={handleCopyLink}>
							<LinkIcon />
							Copy link
						</MenuItem>
						{status === "published" && !isPrivate && (
							<MenuItem
								render={
									<Link
										to={"/packs/$packSlug"}
										params={{ packSlug }}
										target="_blank"
										rel="noopener noreferrer"
									/>
								}
							>
								<ExternalLinkIcon />
								Open in new tab
							</MenuItem>
						)}
					</MenuGroup>

					<MenuSeparator />

					<MenuGroup>
						<MenuGroupLabel>Danger zone</MenuGroupLabel>
						<MenuItem
							variant="destructive"
							onClick={() => setDeletePackOpen(packSlug)}
						>
							<TrashIcon />
							Delete pack
						</MenuItem>
					</MenuGroup>
				</MenuPopup>
			</Menu>

			<BetterDialog
				opened={deletePackOpen === packSlug}
				setOpened={(open) => setDeletePackOpen(open ? packSlug : null)}
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
							<span className="font-semibold">{packName}</span> pack, along with
							all of its topics and questions.
						</p>
					</div>
					<div className="space-y-2">
						<label
							htmlFor="confirm-pack-name"
							className="text-muted-foreground text-sm"
						>
							To confirm, type{" "}
							<span className="select-all font-semibold text-foreground">
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
		</>
	);
}
