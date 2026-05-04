/**
 * Public product roadmap (May 2026). Keep in sync with `/roadmap.md` at repo root.
 */
export type RoadmapItem = {
	title: string;
	description: string;
};

export type RoadmapVersionBlock = {
	version: string;
	/** When true, this patch is shipped and running in production (show on the roadmap page). */
	implemented?: boolean;
	items: RoadmapItem[];
};

export const ROADMAP_INTRO_PARAGRAPHS = [
	"Planning view for May 2026 calver (26.05.xx). The copy players see in “What’s New” stays friendly and outcome-led; this page is the engineering and product planning view.",
	"Shipped highlights live in the app under What’s New. When you cut a release, bump the current version and add a release entry there.",
] as const;

export const ROADMAP_VERSIONS: RoadmapVersionBlock[] = [
	{
		version: "v26.05.02",
		implemented: true,
		items: [
			{
				title: "@-mentions in posts and comments",
				description:
					"Let people tag friends with @username, resolve links to profiles, and persist mentions so tagged users can find the conversation later.",
			},
			{
				title: "Mention notifications (email)",
				description:
					"Send mention alerts by email with sensible deduping, a clear one-line context, and a link straight to the post or comment.",
			},
			{
				title: "Post permalinks, single-post page, and share cards",
				description:
					"Stable URLs for every post; a dedicated post page with full detail (body, image, attachment, comments); reuse the preview pipeline for social shares on desktop and mobile.",
			},
			{
				title: "Comment threading on home",
				description:
					"Full thread UX: replies under comments, collapsible branches, and inline Reply—aligned with existing depth limits—and optimistic updates that still feel instant.",
			},
		],
	},
	{
		version: "v26.05.03",
		items: [
			{
				title: "Better post card, comment section and post page",
				description:
					"Currently the design of the post card, post page and comment thread is not good looking. We need to improve the design (both ui and ux) of these components and pages. On post page make the post wider, and also comment section, currently they have very narrow width. Better reaction bar design (remove user selectable text, because when user holds to react it selects the text), better reactors list and dialog. Make reaction button smaller etc. Fix most of the ui and ux of these sections.",
			},
			{
				title: "“Following” home feed tab",
				description:
					"Add a filter on the home timeline so logged-in users can choose “Everyone” vs “People I follow,” reusing follow relationships already in the product. On following tab, query must have feed=following sync with nuqs.",
			},
			{
				title: "Pack and topic discussion sections",
				description:
					"Surface the same comment system used for posts on published pack and topic pages so communities can discuss sets outside the home feed.",
			},
			{
				title: "Search posts from home search",
				description:
					"Extend the glass search with a dedicated post result type: recent public posts with icons, snippets, and deep links, capped for performance. Posts will be searched by their 'body'.",
			},
			{
				title: "Bookmark posts",
				description:
					"Let logged-in users save posts from the feed to revisit later via a simple list (e.g. profile or settings)—no moderation pipeline required. Bookmarking should be optimistically updated on the ui.",
			},
			{
				title: "Better profile page",
				description:
					"The profile page is getting bigger and bigger. We need to implement tabs for the profile pages of users. Currently on profile page there are - Header (user info, follow/settings buttons), badges section, progress section, my packs section, stats section, published packs section, recent games section and sign out button at the end. Keep the sign out button on all tabs footers (likely in layout) and header, also make the progress section below the header and always visible. Then create badges, stats, packs, and games tabs. Tabs must be synced with query tab=... with nuqs. And most importantly Feed tab (at the first place) where people see user's posts.",
			},
			{
				title: "Better pack/topic/question pages",
				description:
					"Like profile pages, packs/topics/questions pages also need tabs. Keeb the header, main stats and play button. Add analytics and content tab. (content is topics for pack, questions for topic - question itself won't have content), and new tab Discussion which we will implement comments for.",
			},
		],
	},
	{
		version: "v26.05.04",
		items: [
			{
				title: "Host lobby QR code",
				description:
					"Show a scannable QR on the host screen that encodes the existing join URL so in-person players can enter without typing the room code.",
			},
			{
				title: "Remember per-pack default game options",
				description:
					"When a host starts a game, offer to reuse their last spoiler mode, topic subset, and related knobs for that pack so repeat nights need fewer taps.",
			},
			{
				title: "Spoiler settings discoverability",
				description:
					"Short in-product explainer for spoiler-aware play: what each mode does, who sees muted buzzers, and when to pick each option.",
			},
			{
				title: "“Play again” from recap",
				description:
					"From the finished-game screen, one control to spin up a fresh lobby with the same pack (and sensible defaults) so groups can chain sessions quickly.",
			},
		],
	},
	{
		version: "v26.05.05",
		items: [
			{
				title: "Pack tags in the directory",
				description:
					"Optional author-defined tags and matching filters on the packs directory so sets are easier to browse without building playlist collections.",
			},
			{
				title: "Duplicate topic inside a pack",
				description:
					"Let authors clone an existing topic (including its five questions) inside the same pack to iterate on themes or language variants faster.",
			},
			{
				title: "Export pack and topic to files",
				description:
					"Download a pack or single topic in formats aligned with import—e.g. CSV, JSON, TXT, and Markdown—using the same validation shape as the import studio.",
			},
			{
				title: "Profile “draft packs” lane",
				description:
					"A compact strip or section on the profile for drafts and in-progress work, jumping straight into edit or publish flows.",
			},
		],
	},
	{
		version: "v26.05.06",
		items: [
			{
				title: "“Dominator” badge",
				description:
					"Award when the winner’s score is materially ahead of second place (tune thresholds from real game distributions so it stays rare but achievable).",
			},
			{
				title: "“Survivor” badge",
				description:
					"Award when the winner edges out second place by a very small margin—celebrate clutch finishes without encouraging sandbagging.",
			},
			{
				title: "Weekly or seasonal leaderboard snapshot",
				description:
					"Optional time-boxed ladder (e.g. “this week’s XP”) that resets on a schedule, without erasing lifetime boards.",
			},
			{
				title: "Badge detail share previews",
				description:
					"Improve Open Graph and in-app share for individual badges so clips and group chats show the right art and description.",
			},
		],
	},
	{
		version: "v26.05.07",
		items: [
			{
				title: "In-app notification center",
				description:
					"A single inbox for follows, mentions, game outcomes, and product notices; mark read, deep-link to entities, and respect account settings.",
			},
			{
				title: "Notification preferences",
				description:
					"Granular toggles per category (social vs gameplay vs marketing), with a clear “mute all except security” escape hatch.",
			},
			{
				title: "Mention email quiet hours",
				description:
					"Let users pick windows when mention emails are deferred so late-night games don’t wake inboxes—still surfaced in-app immediately.",
			},
			{
				title: "Grouped in-app notifications",
				description:
					"Collapse noisy bursts (several reacts or follows in a row) into one expandable row inside the notification center to keep the feed readable.",
			},
		],
	},
	{
		version: "v26.05.08",
		items: [
			{
				title: "Pack directory advanced filters",
				description:
					"Filter and sort published packs by language, difficulty band, minimum topic count, recency, and simple “hide ones I’ve finished” style toggles where data allows.",
			},
			{
				title: "Host keyboard shortcuts companion",
				description:
					"A lightweight cheat sheet (and optional ⌘/Ctrl-? overlay) for hosts in live games: pause, skip, next, buzzer actions—aligned with real bindings.",
			},
			{
				title: "Multi-select in pack topic list",
				description:
					"Select several topics at once for batch delete, reorder shortcuts, or bulk jump into edit—less friction for large packs.",
			},
			{
				title: "Profile play streaks",
				description:
					"Show a compact streak or activity strip from real sessions so regular players get visible momentum without new competitive ladders.",
			},
		],
	},
	{
		version: "v26.05.09",
		items: [
			{
				title: "PWA polish",
				description:
					"Install prompt, standalone display mode, and shell caching for static assets so return visits feel app-like on phones.",
			},
			{
				title: "Feed virtualization",
				description:
					"Virtualize long home timelines to keep scroll performance steady on mid-range devices during busy evenings.",
			},
			{
				title: "Image pipeline for posts",
				description:
					"Consistent max dimensions, modern formats where supported, and placeholder blur for post images to reduce layout shift.",
			},
			{
				title: "Lazy-loaded game UI chunks",
				description:
					"Split host-only or analytics-heavy panels into async chunks so joiners on slow networks download a smaller first paint before the room goes busy.",
			},
		],
	},
	{
		version: "v26.05.10",
		items: [
			{
				title: "AI-assisted practice host (experiment)",
				description:
					"A clearly labeled opt-in mode where an AI host advances flow, reveals prompts, marks correct or incorrect, skips when allowed, and validates free-text answers with high bar accuracy—only shippable when quality matches human hosting for the supported pack types.",
			},
			{
				title: "Seasonal spotlights and weekend cups",
				description:
					"Time-boxed featured ladders or highlighted pack rows (without full playlist collections) to give the community recurring reasons to gather.",
			},
			{
				title: "Richer stats dashboard for creators",
				description:
					"Authors see return players, completion funnels per topic, and difficulty trends over time on pack and topic analytics pages.",
			},
			{
				title: "Richer oEmbed and link previews",
				description:
					"Improve how external sites and messagers render Xamsa links—packs, games, profiles—with consistent metadata and artwork.",
			},
			{
				title: "Custom pack cover image",
				description:
					"Optional hero art on pack pages (upload + crop) so authors can brand listings and shares without new collection features.",
			},
			{
				title: "Accessibility pass (WCAG-oriented)",
				description:
					"Keyboard paths for feed composer, reactions, and game host controls; focus management in dialogs; contrast fixes in charts.",
			},
			{
				title: "Support-ready error details",
				description:
					"When something fails, offer a copyable bundle (build/version, route, anonymised ids) players can paste to staff—no full session replay required.",
			},
			{
				title: "Data export for accounts",
				description:
					"GDPR-style export: profile, posts, comments, and game history in one downloadable archive.",
			},
			{
				title: "What’s New RSS feed",
				description:
					"A public RSS (or Atom) mirror of release entries so blogs and power users can follow updates outside the app.",
			},
			{
				title: "Post-deploy smoke checks",
				description:
					"Automated probes after release—e.g. can open Play, start a dry lobby, hit auth health—so regressions surface before traffic spikes.",
			},
			{
				title: "Mobile navigation refinements",
				description:
					"Bottom nav or thumb-friendly patterns for feed ↔ play ↔ profile; reduce tap depth to start hosting from home.",
			},
			{
				title: "Community highlights reel",
				description:
					"Surface a curated or algorithmic strip of standout posts, games, or packs on home for logged-out visitors—showcase energy without requiring login.",
			},
		],
	},
];

export function roadmapVersionAnchorId(version: string): string {
	return version.replace(/\./g, "-").toLowerCase();
}
