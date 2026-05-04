import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminCommentsOutputType } from "@xamsa/schemas/modules/admin";
import { adminCommentSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminCommentsFilterUI } from "@/components/admin/filters/admin-comments-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminCommentsOutputType["items"][number];
const col = createColumnHelper<Row>();

const SORT_OPTIONS: AdminSortOption[] = (
	adminCommentSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			newest: "Newest",
			oldest: "Oldest",
			reactions: "Reactions",
		}[value] ?? value,
}));

function TargetCell({ target }: { target: Row["target"] }) {
	if (!target) {
		return <span className="text-muted-foreground text-xs">(unlinked)</span>;
	}

	switch (target.kind) {
		case "post":
			return (
				<Link
					to="/p/$postSlug"
					params={{ postSlug: target.slug }}
					className="text-primary underline-offset-4 hover:underline"
				>
					<span className="line-clamp-1 text-xs">Post · {target.title}</span>
				</Link>
			);
		case "pack":
			return (
				<Link
					to="/packs/$packSlug"
					params={{ packSlug: target.slug }}
					className="text-primary underline-offset-4 hover:underline"
				>
					<span className="line-clamp-1 text-xs">Pack · {target.title}</span>
				</Link>
			);
		case "topic":
			return (
				<Link
					to="/packs/$packSlug/topics/$topicSlug"
					params={{ packSlug: target.packSlug, topicSlug: target.slug }}
					className="text-primary underline-offset-4 hover:underline"
				>
					<span className="line-clamp-1 text-xs">Topic · {target.title}</span>
				</Link>
			);
		case "question":
			return (
				<Link
					to="/packs/$packSlug/topics/$topicSlug"
					params={{
						packSlug: target.packSlug,
						topicSlug: target.topicSlug,
					}}
					className="text-primary underline-offset-4 hover:underline"
				>
					<span className="line-clamp-1 text-xs">
						Question · {target.title}
					</span>
				</Link>
			);
	}
}

export const Route = createFileRoute("/dashboard/comments/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Comments",
			description: "All comments and replies (staff view).",
			path: "/dashboard/comments/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput(
		adminCommentSort.options,
		adminCommentSort.defaultOption,
	);
	const { filterInput, filterUi } = useAdminCommentsFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listComments.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("bodyExcerpt", {
				header: "Body",
				cell: (c) => (
					<span className="line-clamp-2 text-sm">{c.getValue()}</span>
				),
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
			col.accessor("target", {
				header: "Target",
				cell: (c) => <TargetCell target={c.getValue()} />,
			}),
			col.accessor("depth", { header: "Depth" }),
			col.accessor("totalReactions", { header: "Reactions" }),
			col.accessor("createdAt", {
				header: "Created",
				cell: (c) => format(c.getValue(), "yyyy-MM-dd HH:mm"),
			}),
		],
		[],
	);

	return (
		<div>
			<h2 className="mb-4 font-heading font-semibold text-lg">Comments</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof adminCommentSort.options)[number])
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
						{error?.message ?? "Failed to load comments."}
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
