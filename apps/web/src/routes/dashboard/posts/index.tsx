import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminPostsOutputType } from "@xamsa/schemas/modules/admin";
import { adminPostSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminPostsFilterUI } from "@/components/admin/filters/admin-posts-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminPostsOutputType["items"][number];
const col = createColumnHelper<Row>();

const SORT_OPTIONS: AdminSortOption[] = (
	adminPostSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			newest: "Newest",
			oldest: "Oldest",
			reactions: "Reactions",
			comments: "Comments",
		}[value] ?? value,
}));

export const Route = createFileRoute("/dashboard/posts/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Posts",
			description: "All posts (staff view).",
			path: "/dashboard/posts/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput(
		adminPostSort.options,
		adminPostSort.defaultOption,
	);
	const { filterInput, filterUi } = useAdminPostsFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listPosts.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("bodyExcerpt", {
				header: "Body",
				cell: (c) => {
					const row = c.row.original;
					const text = c.getValue() ?? "(no body — image only)";
					return (
						<Link
							to="/p/$postSlug"
							params={{ postSlug: row.slug }}
							className="text-primary underline-offset-4 hover:underline"
						>
							<span className="line-clamp-2 text-sm">{text}</span>
						</Link>
					);
				},
			}),
			col.accessor("author", {
				header: "Author",
				cell: (c) => {
					const a = c.getValue();
					return (
						<Link
							to="/u/$username"
							params={{ username: a.username }}
							className="font-medium text-primary underline-offset-4 hover:underline"
						>
							{a.username}
						</Link>
					);
				},
			}),
			col.accessor("totalReactions", { header: "Reactions" }),
			col.accessor("totalComments", { header: "Comments" }),
			col.accessor("hasImage", {
				header: "Image",
				cell: (c) => (c.getValue() ? "Yes" : "—"),
			}),
			col.accessor("hasAttachment", {
				header: "Attachment",
				cell: (c) => (c.getValue() ? "Yes" : "—"),
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
			<h2 className="mb-4 font-heading font-semibold text-lg">Posts</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof adminPostSort.options)[number])
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
						{error?.message ?? "Failed to load posts."}
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
