import { Link } from "@tanstack/react-router";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import type { PackVisibility } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { Button } from "@xamsa/ui/components/button";
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
	ListIcon,
	LockIcon,
	PencilIcon,
	PlusIcon,
	RedoIcon,
	TrashIcon,
} from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { DeletePackDialog } from "./delete-pack-dialog";

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
	const { copy } = useCopyToClipboard();

	const [, setDeletePackOpen] = useQueryState(
		"delete-pack-open",
		parseAsBoolean.withDefault(false),
	);
	const isPrivate = visibility === "private";

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
					</MenuGroup>

					<MenuSeparator />

					<MenuGroup>
						<MenuGroupLabel>Topics</MenuGroupLabel>
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
						<MenuItem
							render={
								<Link to={"/packs/$packSlug/topics"} params={{ packSlug }} />
							}
						>
							<ListIcon />
							View all topics
						</MenuItem>
						<MenuItem
							render={
								<Link
									to="/packs/$packSlug/topics/edit/reorder"
									params={{ packSlug }}
								/>
							}
						>
							<RedoIcon />
							Reorder topics
						</MenuItem>
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
							onClick={() => setDeletePackOpen(true)}
						>
							<TrashIcon />
							Delete pack
						</MenuItem>
					</MenuGroup>
				</MenuPopup>
			</Menu>

			<DeletePackDialog packSlug={packSlug} packName={packName} />
		</>
	);
}
