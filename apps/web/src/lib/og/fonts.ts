import { getSiteOrigin } from "../site-origin";
import { readPublicBinary } from "./read-public-asset";

/** Font entry shape expected by `@vercel/og` / Satori. */
export type OgFont = {
	name: string;
	data: ArrayBuffer;
	weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
	style?: "normal" | "italic";
};

let cachedFonts: OgFont[] | null = null;

async function loadTtf(filename: string): Promise<ArrayBuffer> {
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

/** Geist Sans Regular + Bold TTFs, loaded once and reused across renders. */
export async function getOgFonts(): Promise<OgFont[]> {
	if (cachedFonts) return cachedFonts;
	const [regular, bold] = await Promise.all([
		loadTtf("Geist-Regular.ttf"),
		loadTtf("Geist-Bold.ttf"),
	]);
	cachedFonts = [
		{ name: "Geist", data: regular, weight: 400, style: "normal" },
		{ name: "Geist", data: bold, weight: 700, style: "normal" },
	];
	return cachedFonts;
}
