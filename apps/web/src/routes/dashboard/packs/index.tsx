import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminPacksOutputType } from "@xamsa/schemas/modules/admin";
import { adminPackSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminPacksFilterUI } from "@/components/admin/filters/admin-packs-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminPacksOutputType["items"][number];

const SORT_OPTIONS: AdminSortOption[] = (
	adminPackSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			newest: "Newest",
			oldest: "Oldest",
			name: "Name",
			slug: "Slug",
			most_topics: "Most topics",
			rating: "Rating",
			plays: "Plays",
			pdr: "PDR",
		}[value] ?? value,
}));

const col = createColumnHelper<Row>();

export const Route = createFileRoute("/dashboard/packs/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Packs",
			description: "All question packs (staff view).",
			path: "/dashboard/packs/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput(
		adminPackSort.options,
		adminPackSort.defaultOption,
	);
	const { filterInput, filterUi } = useAdminPacksFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listPacks.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("slug", {
				header: "Slug",
				cell: (c) => (
					<Link
						to="/packs/$packSlug"
						params={{ packSlug: c.getValue() }}
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						{c.getValue()}
					</Link>
				),
			}),
			col.accessor("name", { header: "Name" }),
			col.accessor("status", { header: "Status" }),
			col.accessor("visibility", { header: "Visibility" }),
			col.accessor("author", {
				header: "Author",
				cell: (c) => {
					const a = c.getValue();
					return (
						<span>
							{a.username}
							<span className="block text-muted-foreground text-xs">
								{a.name}
							</span>
						</span>
					);
				},
			}),
			col.accessor((r) => r._count.topics, {
				id: "topicCount",
				header: "Topics",
			}),
			col.accessor("averageRating", {
				header: "Rating",
				cell: (c) => c.getValue().toFixed(2),
			}),
			col.accessor("pdr", {
				header: "PDR",
				cell: (c) => c.getValue().toFixed(2),
			}),
			col.accessor("totalPlays", { header: "Plays" }),
			col.accessor("createdAt", {
				header: "Created",
				cell: (c) => format(c.getValue(), "yyyy-MM-dd HH:mm"),
			}),
		],
		[],
	);

	return (
		<div>
			<h2 className="mb-4 font-heading font-semibold text-lg">Packs</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof adminPackSort.options)[number])
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
						{error?.message ?? "Failed to load packs."}
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
