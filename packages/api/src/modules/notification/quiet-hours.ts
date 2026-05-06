import prisma from "@xamsa/db";

/**
 * Returns true when the user has email quiet hours enabled and the
 * provided instant falls inside the configured window in the user's
 * timezone. Windows that wrap past midnight (start > end) are supported.
 *
 * Used to drop transactional emails during the user's quiet hours; the
 * matching in-app notification is still created so the user can catch
 * up when they next open the bell.
 */
export async function isInEmailQuietHours(
	userId: string,
	now: Date = new Date(),
): Promise<boolean> {
	const prefs = await prisma.userNotificationPreference.findUnique({
		where: { userId },
		select: {
			emailQuietHoursEnabled: true,
			emailQuietHoursStartMin: true,
			emailQuietHoursEndMin: true,
			emailQuietHoursTimezone: true,
		},
	});
	if (!prefs?.emailQuietHoursEnabled) {
		return false;
	}
	const minute = minuteOfDayInTimezone(now, prefs.emailQuietHoursTimezone);
	return isInsideMinuteWindow(
		minute,
		prefs.emailQuietHoursStartMin,
		prefs.emailQuietHoursEndMin,
	);
}

/**
 * Convert an absolute instant into the wall-clock minute-of-day in the
 * given IANA timezone. We use `Intl.DateTimeFormat` (always available
 * on Node 22+) so we don't have to ship tz data ourselves.
 *
 * Falls back to UTC if the timezone identifier is unknown.
 */
export function minuteOfDayInTimezone(at: Date, timezone: string): number {
	let fmt: Intl.DateTimeFormat;
	try {
		fmt = new Intl.DateTimeFormat("en-GB", {
			timeZone: timezone,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
	} catch {
		fmt = new Intl.DateTimeFormat("en-GB", {
			timeZone: "UTC",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
	}
	const parts = fmt.formatToParts(at);
	const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
	const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
	const safeHh = Number.isFinite(hh) ? hh % 24 : 0;
	const safeMm = Number.isFinite(mm) ? mm % 60 : 0;
	return safeHh * 60 + safeMm;
}

/**
 * Inclusive of `start`, exclusive of `end`. Supports wrap-around so a
 * window like 22:00 -> 07:00 reads as "22:00 today through 07:00 tomorrow".
 * Returns `false` when start === end (degenerate window).
 */
export function isInsideMinuteWindow(
	minute: number,
	start: number,
	end: number,
): boolean {
	if (start === end) {
		return false;
	}
	if (start < end) {
		return minute >= start && minute < end;
	}
	return minute >= start || minute < end;
}
