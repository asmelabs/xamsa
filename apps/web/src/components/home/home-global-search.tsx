"use client";

import { Button } from "@xamsa/ui/components/button";
import { SearchIcon } from "lucide-react";
import { useGlobalSearch } from "@/components/global-search-provider";

/** Home (and elsewhere): opens the app-wide search dialog; ⌘/Ctrl+K works from any route via {@link GlobalSearchProvider}. */
export function HomeGlobalSearch() {
	const { openSearch } = useGlobalSearch();

	return (
		<Button
			type="button"
			variant="outline"
			className="h-11 w-full max-w-xl justify-start gap-2 border-dashed text-muted-foreground shadow-none md:max-w-none"
			onClick={() => openSearch()}
		>
			<SearchIcon className="size-4 shrink-0 opacity-72" strokeWidth={1.75} />
			<span className="truncate">
				Search users, packs, topics… Try leaderboard, play, or dashboard/…
			</span>
			<kbd className="pointer-events-none ml-auto hidden items-center gap-0.5 border bg-muted/72 px-1.5 py-0.5 font-medium font-sans text-[10px] text-muted-foreground md:inline-flex">
				⌘K
			</kbd>
		</Button>
	);
}
