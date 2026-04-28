/**
 * Full URL for invite links — players open this to be signed in (if needed) and
 * joined into the game without pasting the code.
 */
export function getJoinInviteAbsoluteUrl(gameCode: string): string {
	if (typeof window === "undefined") {
		return `/join/${encodeURIComponent(gameCode.trim())}`;
	}
	const path = `/join/${encodeURIComponent(gameCode.trim())}`;
	return new URL(path, window.location.origin).href;
}
