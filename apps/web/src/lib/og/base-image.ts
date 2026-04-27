import { getSiteOrigin } from "../site-origin";
import { readPublicBinary } from "./read-public-asset";

let cachedDataUrl: string | null = null;

/**
 * Load `og-template.png` into a data URL for Satori `backgroundImage`.
 * On Vercel, fetch from the deployed public URL; locally, read from `public/` on disk
 * (avoids broken paths when this module runs from a Vite SSR bundle).
 */
export async function preloadOgBaseImage(): Promise<void> {
	if (cachedDataUrl) return;
	const origin = getSiteOrigin();
	if (origin) {
		const res = await fetch(`${origin}/og-template.png`);
		if (!res.ok) {
			throw new Error(
				`preloadOgBaseImage: fetch og-template.png failed ${res.status}`,
			);
		}
		const buf = Buffer.from(await res.arrayBuffer());
		cachedDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
		return;
	}
	const buf = readPublicBinary("og-template.png");
	cachedDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
}

export function getOgBaseImageDataUrl(): string {
	if (!cachedDataUrl) {
		throw new Error("getOgBaseImageDataUrl: call preloadOgBaseImage() first");
	}
	return cachedDataUrl;
}

export { OG_HEIGHT, OG_WIDTH } from "./dimensions";
