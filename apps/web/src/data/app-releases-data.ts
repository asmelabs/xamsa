import type {
	AppRelease,
	AppReleasesManifest,
} from "@/data/app-releases-types";

export type {
	AppRelease,
	AppReleasesManifest,
	ReleaseHighlight,
} from "@/data/app-releases-types";

const current = { year: 2026, month: 4, patch: 7 } as const;

export const appReleasesManifest: AppReleasesManifest = {
	productName: "Xamsa",
	current,
	releases: [
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
