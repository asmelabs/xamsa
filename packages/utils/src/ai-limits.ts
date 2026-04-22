import { BULK_PACKS_MAX, BULK_TOPICS_MAX } from "@xamsa/schemas/common/bulk";
import type { Role } from "@xamsa/schemas/db/schemas/enums/Role.schema";

/** @see BULK_TOPICS_MAX */
/** @see BULK_PACKS_MAX */
export {
	BULK_PACKS_MAX as BULK_CREATE_PACKS_MAX,
	BULK_TOPICS_MAX as BULK_CREATE_TOPICS_MAX,
};

const DAILY_AI_GENERATION_BY_ROLE: Record<Role, number> = {
	user: 3,
	moderator: 10,
	admin: 50,
};

/**
 * Max successful AI topic-question generations per user per UTC calendar day.
 * Quota is enforced server-side using `User.aiUseCount` and `User.aiUseWindowDate`.
 */
export function getDailyAiGenerationLimit(role: Role): number {
	return DAILY_AI_GENERATION_BY_ROLE[role] ?? DAILY_AI_GENERATION_BY_ROLE.user;
}

/** Midnight UTC for the given instant (used as the quota window key). */
export function startOfUtcDay(date: Date): Date {
	return new Date(
		Date.UTC(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			0,
			0,
			0,
			0,
		),
	);
}

/**
 * Start of the next UTC day after `date` — used for `resetsAt` in quota responses.
 */
export function startOfNextUtcDay(date: Date): Date {
	const d = startOfUtcDay(date);
	return new Date(d.getTime() + 24 * 60 * 60 * 1000);
}
