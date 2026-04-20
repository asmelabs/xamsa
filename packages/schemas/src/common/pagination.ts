import z from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export const PaginationInputSchema = z.object({
	page: z.int().min(1).default(DEFAULT_PAGE),
	limit: z.int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const CursorPaginationInputSchema = z.object({
	cursor: z.string().min(1).optional(),
	limit: PaginationInputSchema.shape.limit,
});

export type TPaginationInput = z.infer<typeof PaginationInputSchema>;
export type TCursorPaginationInput = z.infer<
	typeof CursorPaginationInputSchema
>;

export const PaginationMetadataSchema = z
	.object({
		total: z.int().min(0),
		totalPages: z.int().min(0),
		nextPage: z.int().min(1).nullable(),
		prevPage: z.int().min(1).nullable(),
	})
	.extend(PaginationInputSchema.shape);

export type TPaginationMetadata = z.infer<typeof PaginationMetadataSchema>;

export const CursorPaginationMetadataSchema = z
	.object({
		nextCursor: z.string().min(1).nullable(),
		hasMore: z.boolean(),
	})
	.extend(CursorPaginationInputSchema.shape);

export type TCursorPaginationMetadata = z.infer<
	typeof CursorPaginationMetadataSchema
>;

export const PaginationOutputSchema = <T extends z.ZodType>(item: T) =>
	z.object({
		items: z.array(item),
		metadata: PaginationMetadataSchema,
	});

export const CursorPaginationOutputSchema = <T extends z.ZodType>(item: T) =>
	z.object({
		items: z.array(item),
		metadata: CursorPaginationMetadataSchema,
	});

export type TPaginationOutput<T> = z.infer<
	ReturnType<typeof PaginationOutputSchema<z.ZodType<T>>>
>;

export type TCursorPaginationOutput<T> = z.infer<
	ReturnType<typeof CursorPaginationOutputSchema<z.ZodType<T>>>
>;

export type GetPaginatedItem<T> =
	T extends TPaginationOutput<infer U>
		? U
		: T extends TCursorPaginationOutput<infer U>
			? U
			: never;
