import { Link } from "@tanstack/react-router";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import type { PackVisibility } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { Button } from "@xamsa/ui/components/button";
import {
	Menu,
	MenuItem,
	MenuPopup,
	MenuSeparator,
	MenuTrigger,
} from "@xamsa/ui/components/menu";
import {
	EllipsisIcon,
	GlobeIcon,
	LockIcon,
	PencilIcon,
	PlusIcon,
	TrashIcon,
} from "lucide-react";

interface PackActionsMenuProps {
	packSlug: string;
	visibility: PackVisibility;
	status: PackStatus;
}

export function PackActionsMenu({
	packSlug,
	visibility,
	status,
}: PackActionsMenuProps) {
	const isPrivate = visibility === "private";

	return (
		<Menu>
			<MenuTrigger render={<Button variant="outline" size="icon" />}>
				<EllipsisIcon />
			</MenuTrigger>
			<MenuPopup>
				<MenuItem
					render={<Link to="/packs/$packSlug/edit" params={{ packSlug }} />}
				>
					<PencilIcon />
					Edit pack information
				</MenuItem>
				<MenuItem>
					{isPrivate ? (
						<GlobeIcon className="size-4" />
					) : (
						<LockIcon className="size-4" />
					)}
					{isPrivate ? "Make public" : "Make private"}
				</MenuItem>
				{status === "draft" && (
					<MenuItem
						render={
							<Link to="/packs/$packSlug/topics/new" params={{ packSlug }} />
						}
					>
						<PlusIcon />
						Add a new topic
					</MenuItem>
				)}
				<MenuSeparator />
				<MenuItem variant="destructive">
					<TrashIcon />
					Delete pack
				</MenuItem>
			</MenuPopup>
		</Menu>
	);
}
