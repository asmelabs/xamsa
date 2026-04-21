import { Link } from "@tanstack/react-router";
import { PackageIcon, PlayIcon, StarIcon } from "lucide-react";

interface TrendingPackTileProps {
	pack: {
		slug: string;
		name: string;
		averageRating: number;
		totalPlays: number;
		_count: { topics: number };
	};
}

export function TrendingPackTile({ pack }: TrendingPackTileProps) {
	return (
		<Link
			to="/packs/$packSlug"
			params={{ packSlug: pack.slug }}
			className="group flex w-52 shrink-0 flex-col gap-2 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/30 hover:bg-primary/3"
		>
			<div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<PackageIcon className="size-4" strokeWidth={1.75} />
			</div>
			<h3 className="line-clamp-2 font-medium text-sm leading-snug">
				{pack.name}
			</h3>
			<div className="mt-auto flex items-center gap-3 text-muted-foreground text-xs">
				<span className="inline-flex items-center gap-1">
					<StarIcon className="size-3 fill-current" strokeWidth={0} />
					{pack.averageRating > 0 ? pack.averageRating.toFixed(1) : "—"}
				</span>
				<span className="inline-flex items-center gap-1">
					<PlayIcon className="size-3" strokeWidth={1.75} />
					{pack.totalPlays}
				</span>
				<span>
					{pack._count.topics} {pack._count.topics === 1 ? "topic" : "topics"}
				</span>
			</div>
		</Link>
	);
}
