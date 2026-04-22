import type { TPaginationMetadata } from "@xamsa/schemas/common/pagination";
import { Button } from "@xamsa/ui/components/button";

type AdminListPaginationProps = {
	metadata: TPaginationMetadata | undefined;
	isLoading: boolean;
	onPageChange: (page: number) => void;
};

export function AdminListPagination({
	metadata,
	isLoading,
	onPageChange,
}: AdminListPaginationProps) {
	if (!metadata) {
		return null;
	}

	const { page, total, totalPages, prevPage, nextPage } = metadata;
	const from = total === 0 ? 0 : (page - 1) * metadata.limit + 1;
	const to = Math.min(page * metadata.limit, total);

	return (
		<div className="flex flex-col gap-2 border-border/60 border-t py-3 text-muted-foreground text-sm sm:flex-row sm:items-center sm:justify-between">
			<p>
				{total === 0 ? (
					<>No results</>
				) : (
					<>
						Showing {from}–{to} of {total}
						{totalPages > 0 ? ` · Page ${page} of ${totalPages}` : null}
					</>
				)}
			</p>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={isLoading || prevPage == null}
					onClick={() => {
						if (prevPage != null) onPageChange(prevPage);
					}}
				>
					Previous
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={isLoading || nextPage == null}
					onClick={() => {
						if (nextPage != null) onPageChange(nextPage);
					}}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
