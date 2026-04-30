import { createEnv } from "@t3-oss/env-core";
import z from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: z.string().optional(),
		VITE_PUBLIC_POSTHOG_HOST: z.string().optional(),
		/**
		 * Canonical site origin (no trailing slash), e.g. https://www.xamsa.site.
		 * Used for OG/Twitter absolute URLs, sitemap.xml and robots.txt Sitemap: line,
		 * and should match the property URL in Google Search Console.
		 */
		VITE_PUBLIC_SITE_URL: z.url().optional(),
		/**
		 * Only when the SPA’s address bar origin is not where `/api/auth` is served (e.g. Vite on :3000,
		 * API on :3001). Omit in production if the app loads and calls `/api/auth` on the same host.
		 * Must match `BETTER_AUTH_URL` (scheme/host/port). Do not set to a canonical “site URL” if users
		 * may use another hostname (e.g. `www` vs apex) — leave unset so the client uses `window.location.origin`.
		 */
		VITE_PUBLIC_BETTER_AUTH_URL: z.url().optional(),
	},
	// biome-ignore lint/suspicious/noExplicitAny: we need to use any for the runtime environment
	runtimeEnv: (import.meta as any).env,
	emptyStringAsUndefined: true,
});
