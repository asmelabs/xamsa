/**
 * Canonical https origin for absolute URLs (OG/Twitter meta, serverless self-fetch).
 *
 * - Production: `VITE_PUBLIC_SITE_URL` from the build (preferred).
 * - Vercel: `VERCEL_URL` is always set at runtime; use it so `og:image` is never a
 *   bare path (WhatsApp / Facebook often require absolute URLs).
 */
export function getSiteOrigin(): string | undefined {
	const fromVite = import.meta.env.VITE_PUBLIC_SITE_URL;
	if (typeof fromVite === "string" && fromVite.length > 0) {
		return fromVite.replace(/\/$/, "");
	}
	const vercel =
		typeof process !== "undefined" ? process.env.VERCEL_URL : undefined;
	if (vercel) {
		return `https://${vercel}`;
	}
	return undefined;
}
