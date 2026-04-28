/**
 * Two decimals when rated (matches stored QDR/TDR/PDR precision); "—" otherwise.
 */
export function formatDifficultyDr(value: number, hasRated: boolean): string {
	if (!hasRated) return "—";
	return value.toFixed(2);
}
