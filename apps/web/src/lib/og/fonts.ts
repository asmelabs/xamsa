import { getSiteOrigin } from "../site-origin";
import { readPublicBinary } from "./read-public-asset";

/** Font entry shape expected by `@vercel/og` / Satori. */
export type OgFont = {
	name: string;
	data: ArrayBuffer;
	weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
	style?: "normal" | "italic";
};

/** Must match `fontFamily` on OG JSX (same name as on the marketing site). */
export const OG_FONT_FAMILY = "Geist Mono" as const;

let cachedFonts: OgFont[] | null = null;

async function loadTtf(filename: string): Promise<ArrayBuffer> {
	// In dev, always read from `public/` so `VITE_PUBLIC_SITE_URL` (often pointing at
	// prod) never pulls stale or missing `/og-fonts/*` over the network.
	if (import.meta.env.DEV) {
		const buf = readPublicBinary("og-fonts", filename);
		return buf.buffer.slice(
			buf.byteOffset,
			buf.byteOffset + buf.byteLength,
		) as ArrayBuffer;
	}
	const origin = getSiteOrigin();
	if (origin) {
		const res = await fetch(`${origin}/og-fonts/${filename}`);
		if (!res.ok) {
			throw new Error(
				`Failed to load OG font ${filename} from origin: ${res.status}`,
			);
		}
		return res.arrayBuffer();
	}
	const buf = readPublicBinary("og-fonts", filename);
	return buf.buffer.slice(
		buf.byteOffset,
		buf.byteOffset + buf.byteLength,
	) as ArrayBuffer;
}

/** Geist Mono Regular + Bold TTFs (Vercel geist-font), reused across renders. */
export async function getOgFonts(): Promise<OgFont[]> {
	// In dev, skip the module cache so font file / loader changes apply without restart.
	if (cachedFonts && !import.meta.env.DEV) return cachedFonts;
	const [regular, bold] = await Promise.all([
		loadTtf("GeistMono-Regular.ttf"),
		loadTtf("GeistMono-Bold.ttf"),
	]);
	const fonts: OgFont[] = [
		{ name: OG_FONT_FAMILY, data: regular, weight: 400, style: "normal" },
		{ name: OG_FONT_FAMILY, data: bold, weight: 700, style: "normal" },
	];
	if (!import.meta.env.DEV) cachedFonts = fonts;
	return fonts;
}
