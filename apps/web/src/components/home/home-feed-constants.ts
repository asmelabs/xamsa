/** Breakpoint layout for home mixed feed (counts are posts between sections). */
export const HOME_POST_SLOTS = {
	statsAfter: 5,
	recentAfter: 5,
	trendingAfter: 5,
	signedOutTrendingAfter: 15,
} as const;

export function totalPinnedPostCount(mode: "signedIn" | "signedOut"): number {
	return mode === "signedIn"
		? HOME_POST_SLOTS.statsAfter +
				HOME_POST_SLOTS.recentAfter +
				HOME_POST_SLOTS.trendingAfter
		: HOME_POST_SLOTS.signedOutTrendingAfter;
}
