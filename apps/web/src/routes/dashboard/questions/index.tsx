import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import type { ListAdminQuestionsOutputType } from "@xamsa/schemas/modules/admin";
import { adminQuestionSort } from "@xamsa/schemas/modules/listings/admin";
import { format } from "date-fns";
import { useMemo } from "react";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import {
	AdminListToolbar,
	type AdminSortOption,
} from "@/components/admin/admin-list-toolbar";
import { useAdminQuestionsFilterUI } from "@/components/admin/filters/admin-questions-filters";
import { useAdminListInput } from "@/hooks/use-admin-list-input";
import { pageSeo } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

type Row = ListAdminQuestionsOutputType["items"][number];
const col = createColumnHelper<Row>();

const SORT_OPTIONS: AdminSortOption[] = (
	adminQuestionSort.options as readonly string[]
).map((value) => ({
	value,
	label:
		{
			newest: "Newest",
			order: "Order",
			topic_order: "Topic order",
			text_length: "Text length",
			qdr: "QDR",
		}[value] ?? value,
}));

export const Route = createFileRoute("/dashboard/questions/")({
	component: RouteComponent,
	head: () =>
		pageSeo({
			title: "Staff · Questions",
			description: "All questions (staff view).",
			path: "/dashboard/questions/",
			noIndex: true,
		}),
});

function RouteComponent() {
	const list = useAdminListInput(
		adminQuestionSort.options,
		adminQuestionSort.defaultOption,
	);
	const { filterInput, filterUi } = useAdminQuestionsFilterUI();
	const input = useMemo(
		() => ({ ...list.input, ...filterInput }),
		[list.input, filterInput],
	);

	const { data, isLoading, isError, error } = useQuery(
		orpc.admin.listQuestions.queryOptions({ input }),
	);

	const columns = useMemo(
		() => [
			col.accessor("text", {
				header: "Question",
				cell: (c) => {
					const text = c.getValue();
					const row = c.row.original;
					return (
						<Link
							to="/packs/$packSlug/topics/$topicSlug/questions/$questionSlug"
							params={{
								packSlug: row.topic.pack.slug,
								topicSlug: row.topic.slug,
								questionSlug: row.slug,
							}}
							className="line-clamp-4 max-w-xs whitespace-normal break-words font-medium text-primary underline-offset-4 hover:underline sm:max-w-sm"
						>
							{text}
						</Link>
					);
				},
			}),
			col.accessor("order", { header: "Q #" }),
			col.accessor("qdr", {
				header: "QDR",
				cell: (c) => c.getValue().toFixed(2),
			}),
			col.accessor("topic", {
				header: "Topic / pack",
				cell: (c) => {
					const t = c.getValue();
					return (
						<div>
							<Link
								to="/packs/$packSlug/topics/$topicSlug"
								params={{ packSlug: t.pack.slug, topicSlug: t.slug }}
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								{t.name}
							</Link>
							<span className="block text-muted-foreground text-xs">
								{t.pack.name}
							</span>
						</div>
					);
				},
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
			<h2 className="mb-4 font-heading font-semibold text-lg">Questions</h2>
			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<AdminListToolbar
					sortOptions={SORT_OPTIONS}
					sort={list.sort}
					onSortChange={(v) =>
						void list.setSort(v as (typeof adminQuestionSort.options)[number])
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
						{error?.message ?? "Failed to load questions."}
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
