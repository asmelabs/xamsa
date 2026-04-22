/**
 * Same-origin post-login/register target. Rejects open redirects.
 */
export function getSafePostAuthRedirect(
	raw: string | null | undefined,
): string {
	if (raw == null || raw === "") {
		return "/";
	}

	const trimmed = raw.trim();
	if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
		return trimmed;
	}

	try {
		const next = new URL(trimmed, window.location.origin);
		if (next.origin === window.location.origin) {
			return `${next.pathname}${next.search}${next.hash}`;
		}
	} catch {
		/* invalid URL */
	}

	return "/";
}

export function assignPostAuthRedirect(raw: string | null | undefined): void {
	window.location.assign(getSafePostAuthRedirect(raw));
}
