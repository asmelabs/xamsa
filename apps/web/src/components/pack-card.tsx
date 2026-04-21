import { Link } from "@tanstack/react-router";
import type { GetPaginatedItem } from "@xamsa/schemas/common/pagination";
import type { ListPacksOutputType } from "@xamsa/schemas/modules/pack";
import { Badge } from "@xamsa/ui/components/badge";
import { Card } from "@xamsa/ui/components/card";
import { formatDistanceToNow } from "date-fns";
import { Layers, Lock, Play, Star } from "lucide-react";

const languageLabels: Record<string, string> = {
	az: "AZ",
	en: "EN",
	ru: "RU",
	tr: "TR",
};

const statusConfig = {
	draft: { label: "Draft", variant: "outline" },
	published: { label: "Published", variant: "success" },
	archived: { label: "Archived", variant: "info" },
} as const;

function truncate(text: string, max: number) {
	return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

interface PackCardProps {
	pack: GetPaginatedItem<ListPacksOutputType>;
}

export function PackCard({ pack }: PackCardProps) {
	const hasRatings = pack.totalRatings > 0;
	const status = statusConfig[pack.status];

	return (
		<Card className="flex h-full flex-col transition-colors hover:border-primary/30 hover:bg-primary/3">
			<Link
				to="/packs/$packSlug"
				params={{ packSlug: pack.slug }}
				className="flex flex-1 flex-col p-4"
			>
				{/* Header */}
				<div className="flex items-start justify-between gap-2">
					<h3 className="truncate font-semibold text-base leading-snug">
						{pack.name}
					</h3>
					<div className="flex shrink-0 items-center gap-1.5">
						{pack.visibility === "private" && (
							<Lock className="size-3.5 text-muted-foreground" />
						)}
						<Badge variant="outline" className="text-[10px]">
							{languageLabels[pack.language] ?? pack.language}
						</Badge>
					</div>
				</div>

				{/* Description — fixed height area */}
				<p className="mt-1.5 min-h-10 text-muted-foreground text-sm leading-relaxed">
					{pack.description
						? truncate(pack.description, 100)
						: "No description"}
				</p>

				{/* Stats row */}
				<div className="mt-3 flex items-center gap-3">
					<span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
						<Layers className="size-3" />
						{pack._count.topics} {pack._count.topics === 1 ? "topic" : "topics"}
					</span>
					<span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
						<Play className="size-3" />
						{pack.totalPlays.toLocaleString()}
					</span>
					<span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
						<Star className="size-3" />
						{hasRatings ? pack.averageRating.toFixed(1) : "—"}
					</span>
					{pack.status !== "published" && (
						<Badge variant={status.variant} className="ml-auto text-[10px]">
							{status.label}
						</Badge>
					)}
				</div>

				{/* Spacer pushes footer down */}
				<div className="flex-1" />

				{/* Footer — always at bottom */}
				<div className="mt-4 flex items-center justify-between border-border/50 border-t pt-3">
					<span className="text-muted-foreground text-xs">
						by{" "}
						<Link
							to="/u/$username"
							params={{ username: pack.author.username }}
							className="font-medium text-foreground hover:underline"
							onClick={(e) => e.stopPropagation()}
						>
							{pack.author.name}
						</Link>
					</span>
					<span className="text-[11px] text-muted-foreground">
						{pack.publishedAt
							? formatDistanceToNow(pack.publishedAt, { addSuffix: true })
							: "—"}
					</span>
				</div>
			</Link>
		</Card>
	);
}
