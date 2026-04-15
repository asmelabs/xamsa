import { z } from "zod";

export const SearchInputSchema = z.object({
	query: z.string().trim().optional(),
});

export type TSearchInput = z.infer<typeof SearchInputSchema>;

type DotPaths<
	T,
	Prefix extends string = "",
	Depth extends unknown[] = [],
> = Depth["length"] extends 3
	? never
	: T extends object
		? {
				[K in Extract<keyof T, string>]:
					| `${Prefix}${K}`
					| DotPaths<NonNullable<T[K]>, `${Prefix}${K}.`, [...Depth, unknown]>;
			}[Extract<keyof T, string>]
		: never;

function buildCondition(field: string, query: string): Record<string, unknown> {
	const parts = field.split(".");
	let result: Record<string, unknown> = {
		contains: query,
		mode: "insensitive",
	};

	for (let i = parts.length - 1; i >= 0; i--) {
		result = { [parts[i] as string]: result };
	}

	return result;
}

export function defineSearch<TWhere>(fields: DotPaths<TWhere>[]) {
	return {
		shape: () => SearchInputSchema.shape,

		resolve: (query: string | undefined): TWhere | undefined => {
			if (!query?.trim()) return undefined;

			const trimmed = query.trim();
			const conditions = fields.map((f) => buildCondition(f, trimmed));

			if (conditions.length === 1) return conditions[0] as TWhere;
			return { OR: conditions } as TWhere;
		},
	};
}
