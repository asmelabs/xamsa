/** Matches Xamsa usernames: lowercase letter + alphanumerics, 3–30 chars (see user.username). */
const MENTION_TOKEN = /@([a-z][a-z0-9]{2,29})(?=[^a-z0-9]|$)/g;

/**
 * Unique `@username` handles in order of first appearance. Invalid lengths are skipped.
 */
export function extractMentionUsernames(
	text: string | null | undefined,
): string[] {
	if (text == null || text.length === 0) {
		return [];
	}
	const seen = new Set<string>();
	const out: string[] = [];
	for (const m of text.matchAll(MENTION_TOKEN)) {
		const u = m[1];
		if (!u || u.length < 3 || u.length > 30) {
			continue;
		}
		if (!seen.has(u)) {
			seen.add(u);
			out.push(u);
		}
	}
	return out;
}
