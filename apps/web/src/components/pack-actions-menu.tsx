import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import type { PackVisibility } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import type { ExportPackFormatType } from "@xamsa/schemas/modules/pack";
import { Button } from "@xamsa/ui/components/button";
import {
	Menu,
	MenuGroup,
	MenuGroupLabel,
	MenuItem,
	MenuPopup,
	MenuSeparator,
	MenuSub,
	MenuSubPopup,
	MenuSubTrigger,
	MenuTrigger,
} from "@xamsa/ui/components/menu";
import {
	DownloadIcon,
	EllipsisIcon,
	GlobeIcon,
	LayoutGridIcon,
	LinkIcon,
	ListIcon,
	LockIcon,
	PencilIcon,
	PlayIcon,
	PlusIcon,
	RedoIcon,
	TrashIcon,
} from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { orpc } from "@/utils/orpc";
import { ChangePackVisibilityDialog } from "./change-pack-visibility-dialog";
import { DeletePackDialog } from "./delete-pack-dialog";

const EXPORT_FORMATS: { value: ExportPackFormatType; label: string }[] = [
	{ value: "json", label: "JSON" },
	{ value: "yaml", label: "YAML" },
	{ value: "xml", label: "XML" },
	{ value: "csv", label: "CSV" },
	{ value: "txt", label: "TXT" },
];

function triggerBrowserDownload(
	body: string,
	filename: string,
	mimeType: string,
) {
	const blob = new Blob([body], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}

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
	const [visibilityOpen, setVisibilityOpen] = useState(false);
	const [targetVisibility, setTargetVisibility] =
		useState<PackVisibility>("public");

	const [, setDeletePackOpen] = useQueryState(
		"delete-pack-open",
		parseAsBoolean.withDefault(false),
	);
	const isPrivate = visibility === "private";

	const exportMutation = useMutation(orpc.pack.export.mutationOptions());

	const handleCopyLink = () => {
		copy(`${window.location.origin}/packs/${packSlug}`);
		toast.success("Link copied to clipboard");
	};

	const handleExport = async (format: ExportPackFormatType) => {
		try {
			const result = await exportMutation.mutateAsync({
				slug: packSlug,
				format,
			});
			triggerBrowserDownload(result.body, result.filename, result.mimeType);
			toast.success(`Pack exported as ${format.toUpperCase()}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Export failed");
		}
	};

	const openVisibilityChange = (next: PackVisibility) => {
		setTargetVisibility(next);
		setVisibilityOpen(true);
	};

	return (
		<>
			<Menu>
				<MenuTrigger render={<Button variant="outline" size="icon" />}>
					<EllipsisIcon />
				</MenuTrigger>
				<MenuPopup align="end" sideOffset={6}>
					<MenuGroup>
						<MenuGroupLabel>Pack</MenuGroupLabel>
						<MenuItem
							render={<Link to="/packs/$packSlug/edit" params={{ packSlug }} />}
						>
							<PencilIcon />
							Edit pack details
						</MenuItem>
						<MenuItem
							onClick={() =>
								openVisibilityChange(isPrivate ? "public" : "private")
							}
						>
							{isPrivate ? <GlobeIcon /> : <LockIcon />}
							{isPrivate ? "Make public" : "Make private"}
						</MenuItem>
					</MenuGroup>

					<MenuSeparator />

					<MenuGroup>
						<MenuGroupLabel>Topics</MenuGroupLabel>
						{status === "draft" && (
							<>
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
								<MenuItem
									render={
										<Link
											to="/packs/$packSlug/topics/bulk"
											params={{ packSlug }}
										/>
									}
								>
									<LayoutGridIcon />
									Bulk add topics
								</MenuItem>
							</>
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
						<MenuGroupLabel>Play and share</MenuGroupLabel>
						{status === "published" && (
							<MenuItem
								render={<Link to="/play" search={{ pack: packSlug }} />}
							>
								<PlayIcon />
								Play this pack
							</MenuItem>
						)}
						<MenuItem onClick={handleCopyLink}>
							<LinkIcon />
							Copy link
						</MenuItem>
						<MenuSub>
							<MenuSubTrigger disabled={exportMutation.isPending}>
								<DownloadIcon />
								Export pack
							</MenuSubTrigger>
							<MenuSubPopup>
								{EXPORT_FORMATS.map((format) => (
									<MenuItem
										key={format.value}
										onClick={() => {
											void handleExport(format.value);
										}}
									>
										{format.label}
									</MenuItem>
								))}
							</MenuSubPopup>
						</MenuSub>
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

			<ChangePackVisibilityDialog
				onOpenChange={setVisibilityOpen}
				open={visibilityOpen}
				packName={packName}
				packSlug={packSlug}
				targetVisibility={targetVisibility}
			/>

			<DeletePackDialog packSlug={packSlug} packName={packName} />
		</>
	);
}
