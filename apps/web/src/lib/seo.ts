import { env } from "@xamsa/env/web";

export const SITE_NAME = "Xamsa";

/** Default sharing image (also set in root). */
export const OG_IMAGE_PATH = "/og.png";

export const FAVICON_PATH = "/logo.png";

export const DEFAULT_DESCRIPTION =
	"Xamsa is a live, social quiz game: build question packs with topics, host real-time rounds with a buzzer, and play with friends.";

export const DEFAULT_KEYWORDS =
	"Xamsa, quiz game, live trivia, multiplayer quiz, question packs, buzzer game, real-time quiz, social trivia, host a quiz";

export function absoluteUrl(path: string): string {
	const base = env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, "");
	if (!base) {
		return path;
	}
	return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncateMeta(text: string, max = 155): string {
	const t = text.trim();
	if (t.length <= max) {
		return t;
	}
	return `${t.slice(0, max - 1).trim()}…`;
}

export type PageSeoInput = {
	/** Short page title; becomes “{title} — Xamsa” unless `titleIsFull` is set. */
	title: string;
	description: string;
	/** Comma-separated or natural keyword string */
	keywords?: string;
	/** Pathname for og:url (e.g. `/packs/my-pack/`) */
	path?: string;
	ogTitle?: string;
	ogDescription?: string;
	ogImagePath?: string;
	/** Open Graph type; use `article` for pack/topic/question pages if you prefer */
	ogType?: string;
	noIndex?: boolean;
	/** When true, `title` is used as the full document title (no “— Xamsa” suffix). */
	titleIsFull?: boolean;
};

/**
 * Meta entries for TanStack Router `head`. Uses `property` for Open Graph (not `name`).
 */
export function pageSeo(input: PageSeoInput) {
	const {
		title,
		description,
		keywords = DEFAULT_KEYWORDS,
		path,
		ogTitle,
		ogDescription,
		ogImagePath = OG_IMAGE_PATH,
		ogType = "website",
		noIndex = false,
		titleIsFull = false,
	} = input;

	const desc = truncateMeta(description);
	const documentTitle = titleIsFull ? title : `${title} — ${SITE_NAME}`;
	const ogT = ogTitle ?? documentTitle;
	const ogD = truncateMeta(ogDescription ?? description);
	const ogImageAbs = absoluteUrl(ogImagePath);
	const urlAbs = path ? absoluteUrl(path) : undefined;

	const meta: Array<
		| { title: string }
		| { name: string; content: string }
		| { property: string; content: string }
	> = [
		{ title: documentTitle },
		{ name: "description", content: desc },
		{ name: "keywords", content: keywords },
		...(noIndex
			? ([{ name: "robots", content: "noindex, nofollow" }] as const)
			: []),
		{ property: "og:type", content: ogType },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:title", content: ogT },
		{ property: "og:description", content: ogD },
		{ property: "og:image", content: ogImageAbs },
		...(urlAbs ? [{ property: "og:url", content: urlAbs }] : []),
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: ogT },
		{ name: "twitter:description", content: ogD },
		{ name: "twitter:image", content: ogImageAbs },
	];

	return { meta };
}

/** Root-only: favicon + touch icon (no duplicate OG; each route uses `pageSeo`). */
export function rootIconLinks() {
	return [
		{ rel: "icon" as const, href: FAVICON_PATH, type: "image/png" },
		{ rel: "apple-touch-icon" as const, href: FAVICON_PATH },
	];
}
