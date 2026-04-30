import { parseCalverParam } from "./app-release-calver";
import type {
	AppRelease,
	AppReleasesManifest,
	ReleaseHighlight,
} from "./app-releases-types";

export type { AppRelease, AppReleasesManifest, ReleaseHighlight };

const current = { year: 2026, month: 4, patch: 25 } as const;

export const appReleasesManifest: AppReleasesManifest = {
	productName: "Xamsa",
	current,
	releases: [
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 25,
			title: "Profile photos on Cloudinary: square crop in Settings",
			highlights: [
				{
					kind: "text",
					text: "New @xamsa/upload package talks to Cloudinary with a shared uploadImage-style API. Avatars live under xamsa/[environment]/images/users/<username>/avatar (immutable handle) so they are easy to find in Cloudinary’s Media Library; uploads use explicit folder + asset id so they aren’t stranded under Home.",
				},
				{
					kind: "text",
					text: "Settings includes a profile photo flow: pick an image (JPEG, PNG, or WebP), adjust a square crop with zoom, and save. Cropped uploads are resized to 512² and optimized for delivery (auto format/quality where Cloudinary applies).",
				},
				{
					kind: "text",
					text: "You can replace or remove your avatar. Updating clears a previous Cloudinary asset when it was ours (OAuth/third-party URLs are left alone); removal deletes the Cloudinary copy and clears the stored profile image.",
				},
				{
					kind: "text",
					text: "Server env now requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (documented alongside other secrets in the setup guide).",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 24,
			title:
				"Verified email, account mail change, and gated play with lighter mail",
			highlights: [
				{
					kind: "text",
					text: "Email and password accounts must verify the address before sign-in. After sign-up we show a calm “check your inbox” screen with spam and resend guidance; login and Settings can resend verification too, and unverified sign-in attempts steer you the same way.",
				},
				{
					kind: "text",
					text: "Settings shows verification status and lets you start an email change that confirms the new inbox. Completing the link in your mail can sign you back in automatically afterward.",
				},
				{
					kind: "text",
					text: "Hosting, joining, buzzing, and authoring packs, topics, or questions require a verified email; the UI shows a consistent toast with a path to fix it when something is blocked. Leaving a game you are already in stays available even if you are not verified yet.",
				},
				{
					kind: "text",
					text: "You may get short messages when you win a hosted game or someone new follows you—same mail styling as auth mail, with text-first layout and no large inline image so messages stay small.",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 23,
			title:
				"Smart global search: dashboard shortcuts, typed commands, joinable lobbies",
			highlights: [
				{
					kind: "text",
					text: "⌘K search adds Page results: moderators and admins can type dashboard paths (for example dashboard/users) to jump straight to staff tools without hitting the API.",
				},
				{
					kind: "text",
					text: "Everyone can use shortcuts such as leaderboard or leaderboard:xp, play, history, settings, badges or badges:id, what’s new or whats-new:26.04.25, create:pack, and join:CODE; signed-in users get create:topic (draft packs), create:game (hostable packs when not already in a session), and join:game (recent public waiting lobbies). Guests see login and register.",
				},
				{
					kind: "text",
					text: "Command rows are merged ahead of the usual user, pack, topic, and game search hits, still capped at eight visible rows.",
				},
			],
		},
		{
			releasedAt: "2026-04-30",
			year: 2026,
			month: 4,
			patch: 22,
			title:
				"Alternate answers on topic forms, compact editors, leaderboard ties, staff dashboard polish",
			highlights: [
				{
					kind: "text",
					text: "Single-topic and bulk topic editors include chip inputs for up to five alternate acceptable answers per question (Enter or blur to add), alongside tighter spacing on topic and question fields.",
				},
				{
					kind: "text",
					text: "Global leaderboard ranks use competition scoring: players tied on the board’s primary metric share the same rank, and the next rank skips accordingly (for example 1, 1, 3, …).",
				},
				{
					kind: "text",
					text: "Staff dashboard Users adds follower and following totals with sorting by each count.",
				},
				{
					kind: "text",
					text: "Staff Clicks and Questions tables wrap question text in a bounded width with multiple lines so columns stay readable.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 21,
			title:
				"Structured topic import: TXT, CSV, JSON, XML, YAML, HTTPS URL, and Import dialog",
			highlights: [
				{
					kind: "text",
					text: "Bulk topic creation uses one Import dialog with tabs for copy/paste, local file, HTTPS URL (server fetch with SSRF and size limits), and 3sual (moderators/admins). Parsed drafts fill the bulk editor for review before you start the background job.",
				},
				{
					kind: "text",
					text: "Up to 200 topics apply when topics are loaded via structured import or 3sual; manual entry without import stays capped at 20 per submission, matching server validation.",
				},
				{
					kind: "text",
					text: "On bulk topic creation, each row’s five questions use the same carousel and step dots as the single-topic editor, so you can see progress (text + answer filled) without scrolling a long stack.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 20,
			title:
				"Home global search and leaderboard: hosts, plays, following filter",
			highlights: [
				{
					kind: "text",
					text: "The home page opens a glass-style search dialog (⌘K) where you can find users, your or published packs, topics, and games by code—up to eight mixed results with type badges and deep links, with debounced queries.",
				},
				{
					kind: "text",
					text: "The leaderboard uses a left-hand board picker (Elo, XP, wins, games hosted, games played), one metric column per board, URL state via tab and only-followers, and an “Only following” switch when signed in.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 19,
			title:
				"User follow system: profile counts, follow/unfollow, follower and following lists",
			highlights: [
				{
					kind: "text",
					text: "Public profiles show follower and following counts; signed-in visitors can follow or unfollow other players (not themselves). Denormalized totals stay in sync with the new user_follow table.",
				},
				{
					kind: "text",
					text: "Tapping followers or following opens a paginated list of people with avatars and links to their profiles—ready for future feed, notification, and follower-only pack features.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 18,
			title:
				"Revealed answers show explanation and acceptable answers; host click removal; host skip question",
			highlights: [
				{
					kind: "text",
					text: "When a question is revealed (manually or after a resolution), players see the explanation and acceptable alternate answers when the pack defines them—same Ably payloads and API shapes as the primary answer.",
				},
				{
					kind: "text",
					text: "Hosts can remove any buzz on the current question with confirmation; score, streaks, and aggregates rewind, QDR deltas reverse for scored attempts, and clients get a CLICK_REMOVED event. Removing a correct buzz that expired others is blocked in favor of skip question.",
				},
				{
					kind: "text",
					text: "Hosts can skip the current question entirely: all buzzes are cleared without difficulty updates, the session advances without counting the question as played, and QUESTION_SKIPPED syncs the room. Recap totals split unresolved (no winner) vs host-skipped counts.",
				},
			],
		},
		{
			releasedAt: "2026-04-29",
			year: 2026,
			month: 4,
			patch: 17,
			title:
				"Staff DR filters and sorts, public analytics on pack pages, host topic picks at game start",
			highlights: [
				{
					kind: "text",
					text: "Staff dashboard tables list pack PDR, topic TDR, and question QDR with optional min/max filters and sorting alongside existing columns.",
				},
				{
					kind: "text",
					text: "Published pack, topic, and author-visible question pages include an Analytics section: completed-game counts, buzz outcome charts, hosts and top buzzers, and first/last played timestamps—matching who can already view each entity.",
				},
				{
					kind: "text",
					text: "Hosts starting a live game choose which topics to include (defaults to all topics; explicit subsets require at least five). Sessions advance and finish against that subset while legacy games without stored picks behave like full-pack runs.",
				},
			],
		},
		{
			releasedAt: "2026-04-28",
			year: 2026,
			month: 4,
			patch: 16,
			title:
				"Badges catalog, profile density, and staff badge stats, share sheet for live games",
			highlights: [
				{
					kind: "text",
					text: "Profile badges use a denser grid so the list stays scannable as new awards are added.",
				},
				{
					kind: "text",
					text: "Staff dashboard adds a Badges table: total awards and distinct earners per catalog entry, with search, period/type/category filters, and min/max thresholds for awards and earners.",
				},
				{
					kind: "text",
					text: "New Abomination (5/5 wrong in a topic), Genius (positive net in every topic of a finished game), and Dunce (non-positive net in every topic) badges—metadata in the catalog; server awards at topic end or game finalize like other badges.",
				},
				{
					kind: "text",
					text: "The live game header replaces separate copy-code and copy-invite controls with one Share button that opens a sheet: native Share when available (mobile-first), tap targets for WhatsApp, Telegram, X/Twitter, and Facebook, copy-friendly Discord (paste anywhere), plus quick copy for room code and invite URL.",
				},
			],
		},
		{
			releasedAt: "2026-04-28",
			year: 2026,
			month: 4,
			patch: 15,
			title: "Pack language and replay-safe duplicate questions",
			highlights: [
				{
					kind: "text",
					text: "On your profile, a “My packs” shortcut opens the packs directory filtered to drafts and packs you published—the same directory page with your packs only.",
				},
				{
					kind: "text",
					text: "Game stats (`/g/.../stats`) sync the active tab and filters to the URL: Overview, By round, By player, and Flow—plus round search, buzz counts, TDR and average-QDR bounds, and player search plus score/correct/wrong/buzz ranges so links are shareable and back/forward behave as expected.",
				},
				{
					kind: "text",
					text: "The new Magnificent badge is awarded when the game’s winner finishes with no incorrect answers; it appears in the catalog, recap, and badge flow like other awards.",
				},
				{
					kind: "text",
					text: "On the By player tab, badge awards use compact chips per topic with links to the catalog. Each player’s buzz table adds a multi-select status filter (correct, wrong, expired) with counts per row.",
				},
				{
					kind: "text",
					text: "When you create or edit a pack, you can set the pack language (English, Azerbaijani, Russian, or Turkish) from the form—no more AZ-only flows for single-pack create; URL query defaults for `/packs/new` still work.",
				},
				{
					kind: "text",
					text: "Hosts pick a replay policy when starting a game: normal play; block only players who already saw each question in a past finished game with that pack; or block the whole room for a question if anyone in the room saw it before. The server enforces this on buzz; the buzz area shows why you’re blocked when it applies.",
				},
				{
					kind: "text",
					text: "Hosts can open Share on the live game header to copy the invite URL or send it via common apps—players still land on `/join/YOUR-CODE` with the same validations as typing the room code manually.",
				},
				{
					kind: "text",
					text: "When a replay policy blocks buzzing (room-wide or per-player), the host now sees the same context players get at the buzzer: room lock explains why everyone is muted, and individual blocks list which players cannot buzz on this question.",
				},
			],
		},
		{
			releasedAt: "2026-04-28",
			year: 2026,
			month: 4,
			patch: 14,
			title: "Chart readability and community hosting",
			highlights: [
				{
					kind: "text",
					text: "Score charts on game stats, detailed recap, and profile pages use a clearer multi-series palette with distinct hues in light and dark mode; buzz outcome pies align with success, destructive, and warning tokens.",
				},
				{
					kind: "text",
					text: "Published packs can opt in to “allow others to host” when visibility is public: non-authors may start live games from that pack. Authors control this when creating or editing pack settings.",
				},
				{
					kind: "text",
					text: "The packs directory gains a “Can host” filter (signed-in users): published packs you authored or published packs that allow community hosting.",
				},
			],
		},
		{
			releasedAt: "2026-04-28",
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
				{
					kind: "text",
					text: "On Open Graph images, now the font is monospace, to match the rest of the app.",
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
