import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminTopicBulkJobsOutputType } from "@xamsa/schemas/modules/admin";
import { adminTopicBulkJobSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminTopicBulkJobsOutputType["items"][number];
const col = createColumnHelper<Row>();

const SORT_OPTIONS: AdminSortOption[] = (
	adminTopicBulkJobSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			newest: "Newest",
			updated: "Updated",
			status: "Status",
			pack: "Pack slug",
		}[value] ?? value,
}));

export const Route = createFileRoute("/dashboard/jobs/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Topic bulk jobs",
			description: "Import and bulk topic jobs (staff view).",
			path: "/dashboard/jobs/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const { input, setPage, setSort, setDir, sort, dir } = useAdminListInput(
		adminTopicBulkJobSort.options,
		adminTopicBulkJobSort.defaultOption,
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listTopicBulkJobs.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("packSlug", {
				header: "Pack",
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
			col.accessor("status", { header: "Status" }),
			col.accessor("totalTopics", { header: "Topics" }),
			col.accessor("user", {
				header: "User",
				cell: (c) => {
					const u = c.getValue();
					return (
						<div>
							<Link
								to="/u/$username"
								params={{ username: u.username }}
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								{u.username}
							</Link>
							<span className="block text-muted-foreground text-xs">
								{u.name} · {u.email}
							</span>
						</div>
					);
				},
			}),
			col.accessor("errorMessage", {
				header: "Error",
				cell: (c) => {
					const m = c.getValue();
					return m ? (
						<span className="line-clamp-2 text-destructive text-xs">{m}</span>
					) : (
						"—"
					);
				},
			}),
			col.accessor("createdAt", {
				header: "Created",
				cell: (c) => format(c.getValue(), "yyyy-MM-dd HH:mm"),
			}),
			col.accessor("updatedAt", {
				header: "Updated",
				cell: (c) => format(c.getValue(), "yyyy-MM-dd HH:mm"),
			}),
		],
		[],
	);

	return (
		<div>
			<h2 className="mb-4 font-heading font-semibold text-lg">
				Topic bulk jobs
			</h2>
			<AdminListToolbar
				sortOptions={SORT_OPTIONS}
				sort={sort}
				onSortChange={(v) =>
					void setSort(v as (typeof adminTopicBulkJobSort.options)[number])
				}
				dir={dir}
				onDirToggle={() => void setDir(dir === "asc" ? "desc" : "asc")}
			/>
			<div className="mt-4">
				{isError ? (
					<p className="text-destructive text-sm" role="alert">
						{error?.message ?? "Failed to load jobs."}
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
					onPageChange={(p) => void setPage(p)}
				/>
			</div>
		</div>
	);
}
