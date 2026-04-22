import { current, productName } from "@/data/app-releases-meta";
import type {
	AppRelease,
	AppReleasesManifest,
} from "@/data/app-releases-types";

export type {
	AppRelease,
	AppReleasesManifest,
	ReleaseHighlight,
} from "@/data/app-releases-types";

export const appReleasesManifest: AppReleasesManifest = {
	productName,
	current,
	releases: [
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
