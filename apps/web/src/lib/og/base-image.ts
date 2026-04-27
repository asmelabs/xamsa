import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getSiteOrigin } from "../site-origin";

const here = dirname(fileURLToPath(import.meta.url));

let cachedDataUrl: string | null = null;

/**
 * Load `og-template.png` into a data URL for Satori `backgroundImage`.
 * On Vercel, the source tree is not on disk — fetch from the deployed public URL.
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
	const publicPath = resolve(here, "../../../public/og-template.png");
	const buf = readFileSync(publicPath);
	cachedDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
}

export function getOgBaseImageDataUrl(): string {
	if (!cachedDataUrl) {
		throw new Error("getOgBaseImageDataUrl: call preloadOgBaseImage() first");
	}
	return cachedDataUrl;
}

export { OG_HEIGHT, OG_WIDTH } from "./dimensions";
