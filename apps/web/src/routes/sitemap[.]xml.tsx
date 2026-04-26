import { createFileRoute } from "@tanstack/react-router";
import { getPublicSitemapEntries } from "@xamsa/api/public-sitemap-urls";

function resolveCanonicalOrigin(request: Request): string {
	const fromEnv = process.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, "");
	if (fromEnv) {
		return fromEnv;
	}
	return new URL(request.url).origin;
}

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function buildSitemapXml(
	entries: { path: string; lastmod: Date }[],
	origin: string,
): string {
	const body = entries
		.map((e) => {
			const loc = `${origin}${e.path.startsWith("/") ? e.path : `/${e.path}`}`;
			const lastmod = e.lastmod.toISOString();
			return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export const Route = createFileRoute("/sitemap.xml")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const origin = resolveCanonicalOrigin(request);
				const entries = await getPublicSitemapEntries();
				const xml = buildSitemapXml(entries, origin);
				return new Response(xml, {
					headers: {
						"Content-Type": "application/xml; charset=utf-8",
						"Cache-Control": "public, max-age=3600, s-maxage=3600",
					},
				});
			},
		},
	},
});
