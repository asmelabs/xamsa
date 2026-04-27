import { ImageResponse } from "@vercel/og";
import { OG_HEIGHT, OG_WIDTH } from "./base-image";
import { getOgFonts } from "./fonts";

const ONE_DAY_SECONDS = 60 * 60 * 24;
const ONE_WEEK_SECONDS = ONE_DAY_SECONDS * 7;

/** `Cache-Control` header used for every dynamic OG image response. */
export const OG_CACHE_CONTROL = `public, max-age=${ONE_DAY_SECONDS}, s-maxage=${ONE_DAY_SECONDS}, stale-while-revalidate=${ONE_WEEK_SECONDS}`;

/**
 * Render a React element to a PNG `Response` via `@vercel/og` (Satori + WASM resvg).
 * Avoids native `@resvg/resvg-js` bindings so Vercel serverless can resolve the bundle.
 */
export async function ogImageResponse(
	node: React.ReactElement,
): Promise<Response> {
	const fonts = await getOgFonts();
	const img = new ImageResponse(node, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts,
	});
	const headers = new Headers(img.headers);
	headers.set("Cache-Control", OG_CACHE_CONTROL);
	return new Response(img.body, { status: img.status, headers });
}
