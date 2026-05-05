import { useMutation } from "@tanstack/react-query";
import type { ExportPackFormatType } from "@xamsa/schemas/modules/pack";
import type { ExportFormatType } from "@xamsa/schemas/modules/topic";
import { Button } from "@xamsa/ui/components/button";
import {
	Menu,
	MenuItem,
	MenuPopup,
	MenuTrigger,
} from "@xamsa/ui/components/menu";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";

const FORMAT_LABEL: Record<ExportFormatType, string> = {
	json: "JSON",
	yaml: "YAML",
	xml: "XML",
	csv: "CSV",
	txt: "TXT",
};

const FORMATS: ExportFormatType[] = ["json", "yaml", "xml", "csv", "txt"];

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

interface PackExportMenuProps {
	packSlug: string;
	disabled?: boolean;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	label?: string;
}

export function PackExportMenu({
	packSlug,
	disabled,
	variant = "outline",
	size = "sm",
	label = "Export",
}: PackExportMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const exportMutation = useMutation(orpc.pack.export.mutationOptions());

	const handleExport = async (format: ExportPackFormatType) => {
		try {
			const result = await exportMutation.mutateAsync({
				slug: packSlug,
				format,
			});
			triggerBrowserDownload(result.body, result.filename, result.mimeType);
			toast.success(`Pack exported as ${format.toUpperCase()}`);
			setIsOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Export failed");
		}
	};

	return (
		<Menu open={isOpen} onOpenChange={setIsOpen}>
			<MenuTrigger
				render={
					<Button
						variant={variant}
						size={size}
						disabled={disabled || exportMutation.isPending}
					/>
				}
			>
				<DownloadIcon />
				{label}
			</MenuTrigger>
			<MenuPopup align="end" sideOffset={6}>
				{FORMATS.map((format) => (
					<MenuItem
						key={format}
						onClick={() => {
							void handleExport(format);
						}}
					>
						{FORMAT_LABEL[format]}
					</MenuItem>
				))}
			</MenuPopup>
		</Menu>
	);
}

interface TopicExportMenuProps {
	packSlug: string;
	topicSlug: string;
	disabled?: boolean;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	label?: string;
}

export function TopicExportMenu({
	packSlug,
	topicSlug,
	disabled,
	variant = "outline",
	size = "sm",
	label = "Export",
}: TopicExportMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const exportMutation = useMutation(orpc.topic.export.mutationOptions());

	const handleExport = async (format: ExportFormatType) => {
		try {
			const result = await exportMutation.mutateAsync({
				packSlug,
				slug: topicSlug,
				format,
			});
			triggerBrowserDownload(result.body, result.filename, result.mimeType);
			toast.success(`Topic exported as ${format.toUpperCase()}`);
			setIsOpen(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Export failed");
		}
	};

	return (
		<Menu open={isOpen} onOpenChange={setIsOpen}>
			<MenuTrigger
				render={
					<Button
						variant={variant}
						size={size}
						disabled={disabled || exportMutation.isPending}
					/>
				}
			>
				<DownloadIcon />
				{label}
			</MenuTrigger>
			<MenuPopup align="end" sideOffset={6}>
				{FORMATS.map((format) => (
					<MenuItem
						key={format}
						onClick={() => {
							void handleExport(format);
						}}
					>
						{FORMAT_LABEL[format]}
					</MenuItem>
				))}
			</MenuPopup>
		</Menu>
	);
}
