/**
 * CalVer segment for URLs: `yy.mm.patch` (month zero-padded), e.g. `26.04.11`.
 * Matches `formatCalver` for manifest years 2000–2099.
 */
const CALVER_PARAM = /^(\d{2})\.(\d{2})\.(\d+)$/;

/** Format YY.MM.patch with zero-padded month (e.g. 26.04.1) */
export function formatCalver(parts: {
	year: number;
	month: number;
	patch: number;
}): string {
	const yy = parts.year % 100;
	const mm = String(parts.month).padStart(2, "0");
	return `${yy}.${mm}.${parts.patch}`;
}

/**
 * Parse a `/whats-new/$version` path segment. Returns `null` if the string is
 * not a valid CalVer (wrong shape, month out of range, etc.).
 */
export function parseCalverParam(
	param: string,
): { year: number; month: number; patch: number } | null {
	const m = param.trim().match(CALVER_PARAM);
	if (!m) {
		return null;
	}
	const yy = Number(m[1]);
	const month = Number(m[2]);
	const patch = Number(m[3]);
	if (
		!Number.isInteger(yy) ||
		!Number.isInteger(month) ||
		!Number.isInteger(patch) ||
		month < 1 ||
		month > 12 ||
		patch < 0
	) {
		return null;
	}
	return { year: 2000 + yy, month, patch };
}
