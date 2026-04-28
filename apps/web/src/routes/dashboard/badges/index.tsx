import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminBadgesOutputType } from "@xamsa/schemas/modules/admin";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminBadgesFilterUI } from "@/components/admin/filters/admin-badges-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminBadgesOutputType["items"][number];

const BADGE_SORT_KEYS = [
	"name",
	"badge_id",
	"total_awards",
	"distinct_earners",
] as const;

const SORT_OPTIONS: AdminSortOption[] = BADGE_SORT_KEYS.map((value) => ({
	value,
	label:
		{
			name: "Name",
			badge_id: "Badge id",
			total_awards: "Total awards",
			distinct_earners: "Distinct earners",
		}[value] ?? value,
}));

const col = createColumnHelper<Row>();

export const Route = createFileRoute("/dashboard/badges/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Badges",
			description: "Badge catalog with award counts (staff view).",
			path: "/dashboard/badges/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput([...BADGE_SORT_KEYS], "total_awards");
	const { filterInput, filterUi } = useAdminBadgesFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listBadges.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("badgeId", {
				header: "Badge id",
				cell: (c) => (
					<Link
						params={{ badgeId: c.getValue() }}
						to="/badges/$badgeId"
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						{c.getValue()}
					</Link>
				),
			}),
			col.accessor("name", { header: "Name" }),
			col.accessor("period", { header: "Period" }),
			col.accessor("type", { header: "Type" }),
			col.accessor("category", { header: "Category" }),
			col.accessor("totalAwards", { header: "Total awards" }),
			col.accessor("distinctEarners", {
				header: "Distinct earners",
				cell: (c) => (
					<span title="Distinct users with ≥1 award">{c.getValue()}</span>
				),
			}),
		],
		[],
	);

	return (
		<div>
			<h2 className="mb-4 font-heading font-semibold text-lg">Badges</h2>
			<p className="mb-4 text-muted-foreground text-sm">
				Catalog stats from award rows. Distinct earners counts unique users
				across all games.
			</p>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof BADGE_SORT_KEYS)[number])
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
						{error?.message ?? "Failed to load badges."}
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
