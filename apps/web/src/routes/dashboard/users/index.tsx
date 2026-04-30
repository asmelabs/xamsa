import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminUsersOutputType } from "@xamsa/schemas/modules/admin";
import { adminUserSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminUsersFilterUI } from "@/components/admin/filters/admin-users-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminUsersOutputType["items"][number];
const col = createColumnHelper<Row>();

const SORT_OPTIONS: AdminSortOption[] = (
	adminUserSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			newest: "Newest",
			oldest: "Oldest",
			username: "Username",
			email: "Email",
			xp: "XP",
			elo: "Elo",
			packs: "Packs published",
			followers: "Followers",
			following: "Following",
		}[value] ?? value,
}));

export const Route = createFileRoute("/dashboard/users/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Users",
			description: "All user accounts (staff view).",
			path: "/dashboard/users/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput(
		adminUserSort.options,
		adminUserSort.defaultOption,
	);
	const { filterInput, filterUi } = useAdminUsersFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listUsers.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("username", {
				header: "Username",
				cell: (c) => (
					<Link
						to="/u/$username"
						params={{ username: c.getValue() }}
						className="font-medium text-primary underline-offset-4 hover:underline"
					>
						{c.getValue()}
					</Link>
				),
			}),
			col.accessor("email", { header: "Email" }),
			col.accessor("name", { header: "Name" }),
			col.accessor("role", { header: "Role" }),
			col.accessor("xp", { header: "XP" }),
			col.accessor("level", { header: "Level" }),
			col.accessor("elo", { header: "Elo" }),
			col.accessor("totalGamesHosted", { header: "Hosted" }),
			col.accessor("totalGamesPlayed", { header: "Played" }),
			col.accessor("totalPacksPublished", { header: "Packs" }),
			col.accessor("totalFollowers", { header: "Followers" }),
			col.accessor("totalFollowing", { header: "Following" }),
			col.accessor("createdAt", {
				header: "Created",
				cell: (c) => format(c.getValue(), "yyyy-MM-dd HH:mm"),
			}),
		],
		[],
	);

	return (
		<div>
			<h2 className="mb-4 font-heading font-semibold text-lg">Users</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof adminUserSort.options)[number])
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
						{error?.message ?? "Failed to load users."}
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
