import type { SortOrder } from "@xamsa/schemas/db/schemas/enums/SortOrder.schema";
import { Button } from "@xamsa/ui/components/button";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "@xamsa/ui/components/select";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { SearchBar } from "@/components/search-bar";

const LIMIT_OPTIONS = [10, 25, 50, 100] as const;

export type AdminSortOption<T extends string = string> = {
	value: T;
	label: string;
};

type AdminListToolbarProps<T extends string> = {
	sortOptions: AdminSortOption<T>[];
	sort: T;
	/** `Select` yields `string` — the caller should cast to the exact sort key union. */
	onSortChange: (value: string) => void;
	dir: SortOrder;
	onDirToggle: () => void;
};

export function AdminListToolbar<T extends string>({
	sortOptions,
	sort,
	onSortChange,
	dir,
	onDirToggle,
}: AdminListToolbarProps<T>) {
	const [limit, setLimit] = useQueryState(
		"limit",
		parseAsInteger.withDefault(25),
	);

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
			<div className="min-w-0 flex-1">
				<SearchBar
					label="Search"
					placeholder="Filter…"
					containerClassName="max-w-md"
				/>
			</div>
			<div className="flex flex-wrap items-end gap-2">
				<div className="flex min-w-[9rem] flex-col gap-1">
					<span className="text-muted-foreground text-xs">Sort</span>
					<Select
						value={sort}
						onValueChange={(v) => {
							if (v) onSortChange(v);
						}}
					>
						<SelectTrigger className="min-w-[10rem]">
							<SelectValue placeholder="Sort">
								{sortOptions.find((o) => o.value === sort)?.label ?? sort}
							</SelectValue>
						</SelectTrigger>
						<SelectPopup>
							{sortOptions.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectPopup>
					</Select>
				</div>
				<Button
					type="button"
					variant="outline"
					size="icon"
					aria-label={
						dir === "asc"
							? "Sort direction: ascending"
							: "Sort direction: descending"
					}
					onClick={onDirToggle}
				>
					{dir === "asc" ? (
						<ArrowUpIcon className="size-4" />
					) : (
						<ArrowDownIcon className="size-4" />
					)}
				</Button>
				<div className="flex min-w-[5rem] flex-col gap-1">
					<span className="text-muted-foreground text-xs">Page size</span>
					<Select
						value={String(limit)}
						onValueChange={(v) => {
							if (v) void setLimit(Number(v));
						}}
					>
						<SelectTrigger>
							<SelectValue>{String(limit)}</SelectValue>
						</SelectTrigger>
						<SelectPopup>
							{LIMIT_OPTIONS.map((n) => (
								<SelectItem key={n} value={String(n)}>
									{n}
								</SelectItem>
							))}
						</SelectPopup>
					</Select>
				</div>
			</div>
		</div>
	);
}
