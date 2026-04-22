import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminGamesOutputType } from "@xamsa/schemas/modules/admin";
import { adminGameSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminGamesFilterUI } from "@/components/admin/filters/admin-games-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminGamesOutputType["items"][number];
const col = createColumnHelper<Row>();

const SORT_OPTIONS: AdminSortOption[] = (
	adminGameSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			newest: "Newest",
			oldest: "Oldest",
			started: "Started",
			finished: "Finished",
			code: "Code",
			status: "Status",
			players: "Players",
			topics: "Topics",
			questions: "Questions",
		}[value] ?? value,
}));

export const Route = createFileRoute("/dashboard/games/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Games",
			description: "All game sessions (staff view).",
			path: "/dashboard/games/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput(
		adminGameSort.options,
		adminGameSort.defaultOption,
	);
	const { filterInput, filterUi } = useAdminGamesFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listGames.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("code", {
				header: "Code",
				cell: (c) => {
					const code = c.getValue();
					return (
						<Link
							to="/g/$code"
							params={{ code }}
							className="font-medium font-mono text-primary underline-offset-4 hover:underline"
						>
							{code}
						</Link>
					);
				},
			}),
			col.accessor("status", { header: "Status" }),
			col.accessor("host", {
				header: "Host",
				cell: (c) => {
					const h = c.getValue();
					return (
						<span>
							{h.username}
							<span className="block text-muted-foreground text-xs">
								{h.name}
							</span>
						</span>
					);
				},
			}),
			col.accessor("pack", {
				header: "Pack",
				cell: (c) => {
					const p = c.getValue();
					return (
						<Link
							to="/packs/$packSlug"
							params={{ packSlug: p.slug }}
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							{p.name}
						</Link>
					);
				},
			}),
			col.accessor("totalActivePlayers", { header: "Players" }),
			col.accessor("totalTopics", { header: "Topics" }),
			col.accessor("totalQuestions", { header: "Questions" }),
			col.accessor("createdAt", {
				header: "Created",
				cell: (c) => format(c.getValue(), "yyyy-MM-dd HH:mm"),
			}),
		],
		[],
	);

	return (
		<div>
			<h2 className="mb-4 font-heading font-semibold text-lg">Games</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof adminGameSort.options)[number])
					}
					dir={list.dir}
					onDirToggle={() =>
						void list.setDir(list.dir === "asc" ? "desc" : "asc")
					}
				/>
				<div className="flex justify-end sm:shrink-0">{filterUi}</div>
			</div>
			<div className="mt-4">
				{isError ? (
					<p className="text-destructive text-sm" role="alert">
						{error?.message ?? "Failed to load games."}
					</p>
				) : null}
				<AdminDataTable
					data={data?.items}
					columns={columns}
					isLoading={isLoading}
				/>
				<AdminListPagination
					metadata={data?.metadata}
					isLoading={isLoading}
					onPageChange={(p) => void list.setPage(p)}
				/>
			</div>
		</div>
	);
}
