import { createFileRoute } from "@tanstack/react-router";

function resolveCanonicalOrigin(request: Request): string {
	const fromEnv = process.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, "");
	if (fromEnv) {
		return fromEnv;
	}
	return new URL(request.url).origin;
}

function buildRobotsTxt(origin: string): string {
	const sitemapUrl = `${origin}/sitemap.xml`;
	return `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Disallow: /api/
Disallow: /dashboard
Disallow: /auth/
Disallow: /settings
Disallow: /g/
Disallow: /join
Disallow: /history

Sitemap: ${sitemapUrl}
`;
}

export const Route = createFileRoute("/robots.txt")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const origin = resolveCanonicalOrigin(request);
				const body = buildRobotsTxt(origin);
				return new Response(body, {
					headers: {
						"Content-Type": "text/plain; charset=utf-8",
						"Cache-Control": "public, max-age=86400, s-maxage=86400",
					},
				});
			},
		},
	},
});
