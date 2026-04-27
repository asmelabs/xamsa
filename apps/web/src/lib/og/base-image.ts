import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

let cachedDataUrl: string | null = null;

/**
 * Load `apps/web/public/og-template.png` once and expose it as a data URL so
 * Satori can use it as a CSS background image without making a network round
 * trip during render.
 */
export function getOgBaseImageDataUrl(): string {
	if (cachedDataUrl) return cachedDataUrl;
	// `here` is .../apps/web/src/lib/og — public is two levels up from src.
	const publicPath = resolve(here, "../../../public/og-template.png");
	const buf = readFileSync(publicPath);
	cachedDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
	return cachedDataUrl;
}

/** OG canvas dimensions (Twitter / OpenGraph standard). */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
