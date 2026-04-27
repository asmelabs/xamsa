import { Resvg } from "@resvg/resvg-js";
import satori, { type SatoriOptions } from "satori";
import { OG_HEIGHT, OG_WIDTH } from "./base-image";
import { getOgFonts } from "./fonts";

/**
 * Render a Satori React node to a PNG `Uint8Array`.
 *
 * Layout is fixed at the OpenGraph standard (1200x630) and uses the embedded
 * Geist font set so every endpoint produces consistent, font-rendered output
 * even on hosts that lack system fonts.
 */
export async function renderOgPng(
	node: React.ReactElement,
): Promise<Uint8Array> {
	const fonts = getOgFonts() as unknown as SatoriOptions["fonts"];
	const svg = await satori(node, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts,
	});
	const resvg = new Resvg(svg, {
		fitTo: { mode: "width", value: OG_WIDTH },
	});
	return resvg.render().asPng();
}

const ONE_DAY_SECONDS = 60 * 60 * 24;
const ONE_WEEK_SECONDS = ONE_DAY_SECONDS * 7;

/** `Cache-Control` header used for every dynamic OG image response. */
export const OG_CACHE_CONTROL = `public, max-age=${ONE_DAY_SECONDS}, s-maxage=${ONE_DAY_SECONDS}, stale-while-revalidate=${ONE_WEEK_SECONDS}`;

/** Build the standard PNG `Response` for an OG endpoint. */
export function ogPngResponse(png: Uint8Array): Response {
	const body = new Uint8Array(png);
	return new Response(body, {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": OG_CACHE_CONTROL,
		},
	});
}
