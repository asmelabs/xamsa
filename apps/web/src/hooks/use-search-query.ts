import { useDebouncedValue } from "@tanstack/react-pacer";
import { parseAsString, useQueryState } from "nuqs";

export function useSearchQuery(
	queryKey = "q",
	debounceWait = 300,
	defaultValue = "",
) {
	const [search, setSearch] = useQueryState(
		queryKey,
		parseAsString.withDefault(defaultValue),
	);
	const [debouncedSearch] = useDebouncedValue(search, { wait: debounceWait });

	return [search, debouncedSearch || undefined, setSearch] as const;
}
