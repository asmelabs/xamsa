import type { PackLanguage } from "@xamsa/schemas/db/schemas/enums/PackLanguage.schema";
import type { PackVisibility } from "@xamsa/schemas/db/schemas/enums/PackVisibility.schema";
import { Badge, type BadgeProps } from "@xamsa/ui/components/badge";
import { Globe, Lock } from "lucide-react";

const languageLabels: Record<string, string> = {
	az: "Azerbaijani",
	en: "English",
	ru: "Russian",
	tr: "Turkish",
};

interface PackHeaderChipsProps {
	visibility: PackVisibility;
	language: PackLanguage;
	totalTopics: number;
	variant: BadgeProps["variant"];
	label: string;
}

export function PackHeaderChips({
	visibility,
	language,
	totalTopics,
	variant,
	label,
}: PackHeaderChipsProps) {
	const isPrivate = visibility === "private";

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant={variant}>{label}</Badge>
			<Badge variant="outline">
				{isPrivate ? <Lock className="size-3" /> : <Globe className="size-3" />}
				{isPrivate ? "Private" : "Public"}
			</Badge>
			<Badge variant="outline">{languageLabels[language] ?? language}</Badge>
			<Badge variant="outline">
				Total {totalTopics} {totalTopics === 1 ? "topic" : "topics"}
			</Badge>
		</div>
	);
}
