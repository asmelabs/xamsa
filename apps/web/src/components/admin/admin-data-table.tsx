import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Spinner } from "@xamsa/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@xamsa/ui/components/table";
import { useMemo } from "react";

type AdminDataTableProps<T> = {
	data: T[] | undefined;
	// TanStack’s TValue is per-column; createColumnHelper output doesn’t match ColumnDef<T, unknown>’s stricter default.
	// biome-ignore lint/suspicious/noExplicitAny: see above
	columns: ColumnDef<T, any>[];
	isLoading: boolean;
};

export function AdminDataTable<T>({
	data,
	columns,
	isLoading,
}: AdminDataTableProps<T>) {
	const tableData = useMemo(() => data ?? [], [data]);
	const table = useReactTable({
		data: tableData,
		columns,
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
	});

	return (
		<div className="relative min-h-32">
			{isLoading ? (
				<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 text-muted-foreground">
					<Spinner className="size-8" />
				</div>
			) : null}
			<Table variant="card" className="text-sm">
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id} className="whitespace-nowrap">
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id} className="align-top">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : !isLoading ? (
						<TableRow>
							<TableCell
								colSpan={columns.length}
								className="h-24 text-center text-muted-foreground"
							>
								No rows
							</TableCell>
						</TableRow>
					) : null}
				</TableBody>
			</Table>
		</div>
	);
}
