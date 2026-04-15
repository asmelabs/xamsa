import {
	CursorPaginationInputSchema,
	PaginationInputSchema,
	type TCursorPaginationInput,
	type TCursorPaginationMetadata,
	type TCursorPaginationOutput,
	type TPaginationInput,
	type TPaginationMetadata,
	type TPaginationOutput,
} from "@xamsa/schemas/common/pagination";

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

class Pagination {
	readonly page: number;
	readonly limit: number;

	constructor(
		inputOrPage?: Partial<TPaginationInput> | number,
		limit?: number,
	) {
		const { data } = PaginationInputSchema.safeParse({
			page: typeof inputOrPage === "number" ? inputOrPage : inputOrPage?.page,
			limit: typeof inputOrPage === "number" ? limit : inputOrPage?.limit,
		});

		this.page = data?.page ?? DEFAULT_PAGE;
		this.limit = data?.limit ?? DEFAULT_LIMIT;
	}

	getTotalPages(total: number): number {
		return Math.ceil(total / this.limit);
	}

	generateMetadata(total: number): TPaginationMetadata {
		const totalPages = this.getTotalPages(total);

		return {
			page: this.page,
			limit: this.limit,
			total,
			totalPages,
			nextPage: this.page < totalPages ? this.page + 1 : null,
			prevPage: this.page > 1 ? this.page - 1 : null,
		};
	}

	use() {
		const skip = (this.page - 1) * this.limit;

		return {
			take: this.limit,
			skip,
		};
	}

	output<T>(items: T[], total: number): TPaginationOutput<T> {
		const metadata = this.generateMetadata(total);

		return {
			items,
			metadata,
		};
	}
}

class CursorPagination {
	readonly cursor: string | undefined;
	readonly limit: number;

	constructor(
		inputOrCursor?: Partial<TCursorPaginationInput> | string,
		limit?: number,
	) {
		const { data } = CursorPaginationInputSchema.safeParse({
			cursor:
				typeof inputOrCursor === "string"
					? inputOrCursor
					: inputOrCursor?.cursor,
			limit: typeof inputOrCursor === "string" ? limit : inputOrCursor?.limit,
		});

		this.cursor = data?.cursor;
		this.limit = data?.limit ?? DEFAULT_LIMIT;
	}

	generateMetadata<C extends string>(
		nextCursor: C | null,
		hasMore: boolean,
	): TCursorPaginationMetadata {
		return {
			cursor: this.cursor,
			limit: this.limit,
			nextCursor,
			hasMore,
		};
	}

	use() {
		return {
			take: this.limit + 1,
			...(this.cursor ? { cursor: { id: this.cursor }, skip: 1 } : {}),
		};
	}

	output<T extends object>(
		items: T[],
		key: (item: T) => string,
	): TCursorPaginationOutput<T> {
		const hasMore = items.length > this.limit;
		const data = hasMore ? items.slice(0, this.limit) : items;
		// biome-ignore lint/style/noNonNullAssertion: data is guaranteed to have at least one item
		const nextCursor = hasMore ? key(data[data.length - 1]!) : null;

		return {
			items: data,
			metadata: this.generateMetadata(nextCursor, hasMore),
		};
	}
}

export function definePagination(
	inputOrPage?: Partial<TPaginationInput> | number,
	limit?: number,
) {
	return new Pagination(inputOrPage, limit);
}

export function defineCursorPagination(
	inputOrCursor?: Partial<TCursorPaginationInput> | string,
	limit?: number,
) {
	return new CursorPagination(inputOrCursor, limit);
}
