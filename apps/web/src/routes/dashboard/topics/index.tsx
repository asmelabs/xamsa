import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminTopicsOutputType } from "@xamsa/schemas/modules/admin";
import { adminTopicSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminTopicsFilterUI } from "@/components/admin/filters/admin-topics-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminTopicsOutputType["items"][number];
const col = createColumnHelper<Row>();

const SORT_OPTIONS: AdminSortOption[] = (
	adminTopicSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			order: "Order",
			newest: "Newest",
			name: "Name",
			pack_name: "Pack name",
		}[value] ?? value,
}));

export const Route = createFileRoute("/dashboard/topics/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Topics",
			description: "All topics (staff view).",
			path: "/dashboard/topics/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput(
		adminTopicSort.options,
		adminTopicSort.defaultOption,
	);
	const { filterInput, filterUi } = useAdminTopicsFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listTopics.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("name", {
				header: "Topic",
				cell: (c) => {
					const row = c.row.original;
					return (
						<Link
							to="/packs/$packSlug/topics/$topicSlug"
							params={{ packSlug: row.pack.slug, topicSlug: row.slug }}
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							{c.getValue()}
						</Link>
					);
				},
			}),
			col.accessor("slug", { header: "Slug" }),
			col.accessor("order", { header: "Order" }),
			col.accessor("pack", {
				header: "Pack",
				cell: (c) => {
					const p = c.getValue();
					return (
						<div>
							<Link
								to="/packs/$packSlug"
								params={{ packSlug: p.slug }}
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								{p.name}
							</Link>
							<span className="block text-muted-foreground text-xs">
								{p.status} · {p.author.username}
							</span>
						</div>
					);
				},
			}),
			col.accessor((r) => r._count.questions, {
				id: "qCount",
				header: "Questions",
			}),
			col.accessor("createdAt", {
				header: "Created",
				cell: (c) => format(c.getValue(), "yyyy-MM-dd HH:mm"),
			}),
		],
		[],
	);

	return (
		<div>
			<h2 className="mb-4 font-heading font-semibold text-lg">Topics</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof adminTopicSort.options)[number])
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
						{error?.message ?? "Failed to load topics."}
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
