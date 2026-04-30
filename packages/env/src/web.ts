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
		 * Origin the browser uses to call Better Auth (no trailing slash), e.g. http://localhost:3001.
		 * Must match BETTER_AUTH_URL on the server (same scheme/host/port) so OAuth state cookies align with /api/auth.
		 */
		VITE_PUBLIC_BETTER_AUTH_URL: z.url().optional(),
	},
	// biome-ignore lint/suspicious/noExplicitAny: we need to use any for the runtime environment
	runtimeEnv: (import.meta as any).env,
	emptyStringAsUndefined: true,
});
