import { SortOrderSchema } from "@xamsa/schemas/db/schemas/enums/SortOrder.schema";
import { type Options, parseAsStringEnum, useQueryState } from "nuqs";

export function useSortQuery<const T extends string[]>(
	options: T,
	defaultValue: T[number],
) {
	const [sort, setSort] = useQueryState(
		"sort",
		parseAsStringEnum(options).withDefault(defaultValue),
	) as [
		T[number],
		(
			value: T[number] | ((old: T[number]) => T[number] | null) | null,
			options?: Options,
		) => Promise<URLSearchParams>,
	];

	const [dir, setDir] = useQueryState(
		"dir",
		parseAsStringEnum(SortOrderSchema.options).withDefault(
			SortOrderSchema.enum.desc,
		),
	);

	return {
		sort,
		setSort,
		dir,
		setDir,
	};
}
