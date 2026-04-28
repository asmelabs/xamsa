import { parseCalverParam } from "./app-release-calver";
import type {
	AppRelease,
	AppReleasesManifest,
	ReleaseHighlight,
} from "./app-releases-types";

export type { AppRelease, AppReleasesManifest, ReleaseHighlight };

const current = { year: 2026, month: 4, patch: 13 } as const;

export const appReleasesManifest: AppReleasesManifest = {
	productName: "Xamsa",
	current,
	releases: [
		{
			releasedAt: "2026-04-27",
			year: 2026,
			month: 4,
			patch: 13,
			title: "Live difficulty ratings for questions, topics, and packs",
			highlights: [
				{
					kind: "text",
					text: "Each question, topic, and published pack now carries difficulty ratings (QDR, TDR, PDR on a 1–10 scale) that update when ranked games finish and the host marks buzzes correct or wrong. Ratings use players’ Elo at game start so stronger opponents raising or lowering difficulty means something.",
				},
				{
					kind: "text",
					text: "Draft and published packs both contribute—only archived packs are skipped—so playtests while you iterate move the numbers before go-live.",
				},
				{
					kind: "text",
					text: "Ratings store two decimal places so gradual shifts stay visible instead of rounding away small moves.",
				},
				{
					kind: "text",
					text: "Pack and topic pages, question detail, lists and cards, and live-game host tooling surface these values where helpful (including host-only live question difficulty).",
				},
			],
		},
		{
			releasedAt: "2026-04-27",
			year: 2026,
			month: 4,
			patch: 12,
			title: "Dynamic OG images and AI topic seeding",
			highlights: [
				{
					kind: "text",
					text: "Pack, topic, user, game, badge, and release pages now serve a dedicated Open Graph image generated from live data. The leaderboard, Play, and Join pages also have their own preview images, including the current top three Elo players for the leaderboard.",
				},
				{
					kind: "text",
					text: "Each preview is rendered on top of the new Xamsa template (orange bars, bow-tie logo) with the entity name, author, key stats, and avatar where applicable. Images are cached for a day with a week of stale-while-revalidate so social platforms always have something to show.",
				},
				{
					kind: "text",
					text: "Topic creation gains a second AI button: “Generate topic with AI” drafts a name and one-sentence description for an empty row. It uses the same daily AI quota as question generation (one credit per click) and is told the pack’s existing topic names so it never duplicates.",
				},
				{
					kind: "text",
					text: "The bulk topic creator gets a per-row “AI topic” shortcut that fills only that row’s name and description, leaving the five question rows untouched. Both flows accept an optional seed/hint and optional author instructions.",
				},
			],
		},
		{
			releasedAt: "2026-04-27",
			year: 2026,
			month: 4,
			patch: 11,
			title: "Badges: live room toasts, catalog, profile, and recap",
			highlights: [
				{
					kind: "text",
					text: "Earning a badge in a live game (topic awards like Ace or Jackpot, question awards like Scavenger, and more) is written to the database and broadcast to everyone in the room, so the celebration appears at the right time for host and players—not only after a refresh.",
				},
				{
					kind: "text",
					text: "When several badges are earned together, the room shows a single bottom strip: each winner and their badge names, with a close control and a few seconds to read, without blocking play.",
				},
				{
					kind: "text",
					text: "The completed game screen and “Full stats” (By player) list each person’s badges inside their own player card, grouped by pack topic, with links to the badge catalog. The old standalone block of every badge in one list is removed.",
				},
				{
					kind: "text",
					text: "New public pages browse all badges and who earned a badge; your profile has a Badges section with counts and a detail view per achievement. Sitemap and SEO cover the new routes.",
				},
				{
					kind: "routerLink",
					before: "Open ",
					to: "/badges/",
					label: "Badges",
					after:
						" to explore the full catalog, or check your profile to see your history.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 10,
			title: "AI topic generation: Google Gemini 2.5",
			highlights: [
				{
					kind: "text",
					text: "“Generate with AI” for pack topics now uses Google Gemini 2.5 Pro via the Gemini API (Google AI Studio), instead of Groq. Configure the server with GEMINI_API_KEY; Groq is no longer used.",
				},
				{
					kind: "text",
					text: "The primary model is gemini-2.5-pro for stronger multilingual (including Azerbaijani) phrasing, instruction-following, and general knowledge. If the service returns a rate or quota error (for example 429), the same request is retried once with gemini-2.5-flash.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 9,
			title: "Host-only game XP, Elo for play, advanced recap",
			highlights: [
				{
					kind: "text",
					text: "XP and levels from live games are for the host only (hosting a session). Player progression uses Elo and your existing stats, not play XP. Every completed game still awards the host the usual hosting bonus, including when the host ends the game early.",
				},
				{
					kind: "text",
					text: "The game stats Flow tab has a player multiselect (default all) that filters the score-over-time chart, plus a Q1–Q5 × rounds score matrix with row and column totals. Streaks stay on Overview; recent games and public history still exclude lobby-only cancels.",
				},
				{
					kind: "text",
					text: "When a game finishes, the end screen can show hosting XP and your ranked Elo change (when two or more players played). Host header and current-question reveal UI are tightened for small screens.",
				},
				{
					kind: "text",
					text: "On game stats Flow, the Q1–Q5 matrix has a “Show” menu: pick points, total clicks, correct / wrong / expired counts, or first-buzz counts. Cells show one value at a time and row, column, and grand totals follow the same metric.",
				},
				{
					kind: "text",
					text: "Public profiles list more lifetime numbers (wrong and expired buzzes, first buzzes, topics and questions played, time playing and hosting, published packs). There is a buzz-outcome pie chart and a last-12-months bar of completed games you played or hosted.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 8,
			title: "Lobby cancel, buzz UX, and end-game polish",
			highlights: [
				{
					kind: "text",
					text: "If the host ends the game from the lobby before it starts, everyone returns to Play and that session no longer appears in recent games or the public history feed; detailed stats for that code are unavailable.",
				},
				{
					kind: "text",
					text: "The host sees a compact buzz queue under the controls on smaller screens, and “who buzzed” notifications line up with the real-time queue. Your own wrong buzz in the player queue now uses the same struck-through style as other players.",
				},
				{
					kind: "text",
					text: "After a real game, if you have already rated the pack, the end screen shows your score instead of asking you to rate again. Broader per-round charts and heatmaps can build on the existing recap over time.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 7,
			title: "Topic deletion",
			highlights: [
				{
					kind: "text",
					text: "You can now delete topics from your packs. This is useful if you want to remove a topic from your pack.",
				},
			],
		},
		{
			releasedAt: "2026-04-23",
			year: 2026,
			month: 4,
			patch: 6,
			title: "Fair play, Elo, leaderboard, and public game history",
			highlights: [
				{
					kind: "text",
					text: "Ending a game from the lobby (before it starts) no longer awards XP, stats, or pack plays; only completed sessions after go-live count.",
				},
				{
					kind: "text",
					text: "Buzzers close after the question is revealed; manual reveal expires pending buzzes. Server records buzz time for a fair queue; host resolves in true position order with a clearer next-player row.",
				},
				{
					kind: "text",
					text: "Elo updates when a ranked game finishes even if the host uses End game; leaderboard shows Elo after one game as a player and includes hosts on XP (and related boards) when they have hosted but not yet played.",
				},
				{
					kind: "routerLink",
					before: "Open ",
					to: "/games/history",
					label: "Recent games",
					after:
						" for a public feed of finished sessions; the Play page links here too.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 5,
			title: "Pack pages, editor layout, and pack actions",
			highlights: [
				{
					kind: "text",
					text: "Pack builder routes now use a consistent header, breadcrumbs, and page shell on create, edit, bulk, and topic or question screens.",
				},
				{
					kind: "text",
					text: "The pack overflow menu can switch public/private (with a short confirm), open Play, jump to bulk topic import, and keeps copy link, topics, reorder, and delete working.",
				},
				{
					kind: "text",
					text: "On your pack, Publish stays visible in draft: it is disabled with a tooltip until you have the minimum number of topics; rating prompts are clearer for visitors and after games.",
				},
				{
					kind: "text",
					text: "Topics list on the pack’s Topics page shows each row’s question count; question pages can step previous/next in the topic when you are the author.",
				},
				{
					kind: "routerLink",
					before: "Open ",
					to: "/packs/",
					label: "Packs",
					after: " to browse or start from Create a pack.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 4,
			title: "3sual import and async bulk topic jobs",
			highlights: [
				{
					kind: "text",
					text: "Where allowed, you can preview and import a 3sual package into a draft pack, with validation and duplicate checks before topics are created.",
				},
				{
					kind: "text",
					text: "Large topic imports run as a background job: you get a job id, a modal with progress, and the client polls until creation finishes—no long blocking request (uses extended runtime on Vercel where available).",
				},
				{
					kind: "text",
					text: "Bulk create for packs and topics is integrated with the same import flow when creating a pack with a 3sual source.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 3,
			title: "Global leaderboard and finished-game stats",
			highlights: [
				{
					kind: "text",
					text: "The Leaderboard page is live: global rankings by Elo (default), XP and level, wins, or career points, with load-more pagination.",
				},
				{
					kind: "text",
					text: "After a game ends, use Full stats to open a detailed recap: charts, every round and question, all buzzes with timestamps, and a per-player breakdown.",
				},
				{
					kind: "routerLink",
					before: "Open ",
					to: "/leaderboard/",
					label: "Leaderboard",
					after: " anytime to see how you stack up.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 2,
			title: "Auth redirect and session refresh",
			highlights: [
				{
					kind: "text",
					text: "After sign up with email verification off, you go straight to your redirect URL or home instead of the “check your inbox” screen.",
				},
				{
					kind: "text",
					text: "After login or register, the app reloads in place so the signed-in home and tabs show your account without a manual refresh.",
				},
				{
					kind: "text",
					text: "Redirect URLs after auth are limited to same-origin paths for safety.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 1,
			title: "SEO and social sharing",
			highlights: [
				{
					kind: "text",
					text: "Every route now sets clearer titles, descriptions, and keywords for search and previews.",
				},
				{
					kind: "text",
					text: "Open Graph and Twitter cards use a shared default image; favicon and touch icon use the app logo.",
				},
				{
					kind: "text",
					text: "Pack, topic, question, profile, play, and game pages include context-specific copy; private flows use noindex where appropriate.",
				},
				{
					kind: "text",
					text: "Optional VITE_PUBLIC_SITE_URL produces absolute og:image and og:url in production.",
				},
			],
		},
		{
			releasedAt: "2026-04-22",
			year: 2026,
			month: 4,
			patch: 0,
			title: "Initial release",
			highlights: [
				{
					kind: "text",
					text: "Initial release of Xamsa.",
				},
				{
					kind: "text",
					text: "You can now create your account and start playing games.",
				},
				{
					kind: "text",
					text: "You can create packs, topics and questions, also edit and reorder them before publishing.",
				},
				{
					kind: "text",
					text: "You can host your own packs, send game codes to your friends and play together.",
				},
				{
					kind: "text",
					text: "You will gain XP and ELO for hosting and playing respectively.",
				},
			],
		},
	],
};

export function getReleasesNewestFirst(): AppRelease[] {
	return [...appReleasesManifest.releases].sort((a, b) => {
		if (a.year !== b.year) {
			return b.year - a.year;
		}
		if (a.month !== b.month) {
			return b.month - a.month;
		}
		return b.patch - a.patch;
	});
}

export function releaseMatchesCurrent(r: AppRelease): boolean {
	return (
		r.year === current.year &&
		r.month === current.month &&
		r.patch === current.patch
	);
}

export function getReleaseByCalverParam(param: string): AppRelease | undefined {
	const parts = parseCalverParam(param);
	if (!parts) {
		return undefined;
	}
	return appReleasesManifest.releases.find(
		(r) =>
			r.year === parts.year &&
			r.month === parts.month &&
			r.patch === parts.patch,
	);
}
