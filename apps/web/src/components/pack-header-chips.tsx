import type { PackLanguage } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import type { PackStatus } from "@xamsa/schemas/db/schemas/enums/PackStatus.schema";
import type { PackVisibility } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { Badge } from "@xamsa/ui/components/badge";
import { Layers, Lock } from "lucide-react";

const languageLabels: Record<string, string> = {
	az: "Azərbaycanca",
	en: "English",
	ru: "Русский",
	tr: "Türkçe",
};

const statusConfig = {
	draft: { label: "Draft", variant: "outline" },
	published: { label: "Published", variant: "success" },
	archived: { label: "Archived", variant: "info" },
} as const;

interface PackHeaderChipsProps {
	status: PackStatus;
	visibility: PackVisibility;
	language: PackLanguage;
	totalTopics: number;
}

export function PackHeaderChips({
	status,
	visibility,
	language,
	totalTopics,
}: PackHeaderChipsProps) {
	const isPrivate = visibility === "private";
	const { label, variant } = statusConfig[status];

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<Badge variant={variant}>{label}</Badge>
			{isPrivate && (
				<Badge variant="outline">
					<Lock className="size-3" />
					Private
				</Badge>
			)}
			<Badge variant="outline">{languageLabels[language] ?? language}</Badge>
			<Badge variant="outline">
				<Layers className="size-3" />
				{totalTopics} {totalTopics === 1 ? "topic" : "topics"}
			</Badge>
		</div>
	);
}
