import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminClicksOutputType } from "@xamsa/schemas/modules/admin";
import { adminClickSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminClicksFilterUI } from "@/components/admin/filters/admin-clicks-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminClicksOutputType["items"][number];
const col = createColumnHelper<Row>();

const SORT_OPTIONS: AdminSortOption[] = (
	adminClickSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			newest: "Newest (clicked)",
			oldest: "Oldest (clicked)",
			created: "Created",
			reaction: "Reaction time",
			position: "Position",
			points: "Points",
			ms: "Milliseconds",
		}[value] ?? value,
}));

export const Route = createFileRoute("/dashboard/clicks/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Clicks",
			description: "Buzzer click events (staff view).",
			path: "/dashboard/clicks/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput(
		adminClickSort.options,
		adminClickSort.defaultOption,
	);
	const { filterInput, filterUi } = useAdminClicksFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listClicks.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("clickedAt", {
				header: "Clicked",
				cell: (c) => format(c.getValue(), "yyyy-MM-dd HH:mm:ss"),
			}),
			col.accessor("status", { header: "Status" }),
			col.accessor("reactionMs", {
				header: "Ms",
				cell: (c) => {
					const v = c.getValue();
					return v == null ? "—" : String(v);
				},
			}),
			col.accessor("pointsAwarded", { header: "Points" }),
			col.accessor("position", { header: "Pos" }),
			col.accessor("game", {
				header: "Game",
				cell: (c) => {
					const g = c.getValue();
					return (
						<Link
							to="/g/$code"
							params={{ code: g.code }}
							className="font-mono text-primary text-sm underline-offset-4 hover:underline"
						>
							{g.code}
						</Link>
					);
				},
			}),
			col.accessor("player", {
				header: "Player",
				cell: (c) => {
					const p = c.getValue();
					return (
						<span>
							<Link
								to="/u/$username"
								params={{ username: p.user.username }}
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								{p.user.username}
							</Link>
							<span className="block text-muted-foreground text-xs">
								{p.user.name} · {p.score} pts
							</span>
						</span>
					);
				},
			}),
			col.accessor("question", {
				header: "Question",
				cell: (c) => {
					const q = c.getValue();
					return (
						<span className="line-clamp-2 text-sm">
							{q.order}. {q.slug}
						</span>
					);
				},
			}),
			col.accessor("topic", {
				header: "Topic",
				cell: (c) => {
					const t = c.getValue();
					return (
						<span>
							{t.name}
							<span className="block text-muted-foreground text-xs">
								#{t.order}
							</span>
						</span>
					);
				},
			}),
		],
		[],
	);

	return (
		<div>
			<h2 className="mb-4 font-heading font-semibold text-lg">Clicks</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof adminClickSort.options)[number])
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
						{error?.message ?? "Failed to load clicks."}
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
