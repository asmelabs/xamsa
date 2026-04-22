/**
 * Splits a comma/space-separated list from URL search params, trims, drops empties.
 */
export function parseCommaList(
	value: string | null | undefined,
): string[] | undefined {
	if (value == null || value === "") return undefined;
	const parts = value
		.split(/[,\n]+/g)
		.map((s) => s.trim())
		.filter(Boolean);
	return parts.length ? parts : undefined;
}

export function joinCommaList(values: string[] | undefined): string {
	if (!values?.length) return "";
	return values.join(",");
}

export function countTruthy(
	entries: ReadonlyArray<{
		value: unknown;
		isActive?: (v: unknown) => boolean;
	}>,
): number {
	let n = 0;
	for (const { value, isActive } of entries) {
		const a = isActive
			? isActive(value)
			: value != null && value !== "" && value !== false;
		if (a) n += 1;
	}
	return n;
}
