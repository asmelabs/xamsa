import type { LeaderboardPeriodType } from "@xamsa/schemas/modules/user";

/**
 * Compute the start of the current period in UTC for windowed leaderboards.
 *
 * - `week`  → start of the current ISO week (Monday 00:00:00 UTC)
 * - `month` → start of the current calendar month (UTC)
 * - `year`  → start of the current calendar year (UTC)
 * - `all`   → returns `null`; callers should fall back to the lifetime path
 */
export function periodStart(
	period: LeaderboardPeriodType,
	now: Date = new Date(),
): Date | null {
	if (period === "all") {
		return null;
	}

	const y = now.getUTCFullYear();
	const m = now.getUTCMonth();
	const d = now.getUTCDate();

	if (period === "year") {
		return new Date(Date.UTC(y, 0, 1));
	}
	if (period === "month") {
		return new Date(Date.UTC(y, m, 1));
	}

	// ISO week: Monday=1..Sunday=7. JS getUTCDay returns Sun=0..Sat=6.
	const dayOfWeek = now.getUTCDay();
	const isoOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
	return new Date(Date.UTC(y, m, d - isoOffset));
}
