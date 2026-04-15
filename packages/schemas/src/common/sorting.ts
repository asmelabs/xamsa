import { z } from "zod";

type OrderBy<T> = T | T[];

type SortingValues<TOrderBy> = Record<
	string,
	OrderBy<TOrderBy> | "asc" | "desc"
>;

interface SortingConfig<TOrderBy, TValues extends SortingValues<TOrderBy>> {
	values: TValues;
	default?: Extract<keyof TValues, string>;
}

export function defineSorting<TOrderBy>() {
	return <const TValues extends SortingValues<TOrderBy>>(
		config: SortingConfig<TOrderBy, TValues>,
	) => {
		type TKeys = Extract<keyof TValues, string>;

		const keys = Object.keys(config.values) as [TKeys, ...TKeys[]];
		const defaultKey = (config.default ?? keys[0]) as TKeys;

		const sortSchema = z.enum(keys);
		const dirSchema = z.enum(["asc", "desc"]);

		return {
			schema: (defaultValue?: TKeys) =>
				sortSchema.default(defaultValue ?? defaultKey),

			shape: (defaultValue?: TKeys) => ({
				sort: sortSchema.default(defaultValue ?? defaultKey),
				dir: dirSchema.optional(),
			}),

			resolve: (key: TKeys, dir?: "asc" | "desc"): OrderBy<TOrderBy> => {
				const value = config.values[key];

				if (value === "asc" || value === "desc") {
					return { [key]: dir ?? value } as TOrderBy;
				}

				if (dir) {
					return Array.isArray(value)
						? (value.map((v) => replaceDir(v, dir)) as TOrderBy[])
						: (replaceDir(value, dir) as TOrderBy);
				}

				return value as OrderBy<TOrderBy>;
			},
		};
	};
}

function replaceDir<T>(obj: T, dir: "asc" | "desc"): T {
	if (typeof obj !== "object" || obj === null) {
		return (obj === "asc" || obj === "desc" ? dir : obj) as T;
	}

	const result: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
		result[k] = replaceDir(v, dir);
	}
	return result as T;
}
