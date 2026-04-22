/** True when the app session user is allowed to use staff-only (moderator) routes. */
export function isStaffRole(
	role: string | null | undefined,
): role is "moderator" | "admin" {
	return role === "moderator" || role === "admin";
}
