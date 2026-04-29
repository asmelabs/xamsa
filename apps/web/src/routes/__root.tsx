import geistMonoLatin from "@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff2?url";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { env } from "@xamsa/env/web";
import { Toaster } from "@xamsa/ui/components/sonner";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { AppContentShell } from "@/components/app-content-shell";
import { BottomTabMenu } from "@/components/bottom-tab-menu";
import { DeferredPostHogProvider } from "@/components/deferred-posthog-provider";
import { GlobalSearchProvider } from "@/components/global-search-provider";
import { getUser } from "@/functions/get-user";
import { rootIconLinks } from "@/lib/seo";
import { orpc } from "@/utils/orpc";
import appCss from "../index.css?url";

export type RouterSession = Awaited<ReturnType<typeof getUser>>;

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
	session: RouterSession | null;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	beforeLoad: async ({ context }) => {
		const session = await getUser();
		if (session?.user) {
			await context.queryClient
				.ensureQueryData(orpc.user.getActiveGame.queryOptions({ input: {} }))
				.catch(() => null);
		}
		return { session };
	},
	head: () => ({
		meta: [
			{
				name: "apple-mobile-web-app-title",
				content: "Xamsa",
			},
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content:
					"width=device-width, initial-scale=1, maximum-scale=5, interactive-widget=resizes-content",
			},
			{
				name: "color-scheme",
				content: "dark",
			},
			{
				name: "theme-color",
				content: "#0a0a0a",
			},
		],
		links: [
			{
				rel: "preload",
				href: geistMonoLatin,
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous",
			},
			{
				rel: "preload",
				href: appCss,
				as: "style",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon-96x96.png",
				sizes: "96x96",
			},
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg",
			},
			{
				rel: "shortcut icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png",
			},
			{
				rel: "manifest",
				href: "/site.webmanifest",
			},
			...rootIconLinks(),
		],
	}),

	component: RootDocument,
});

function RootDocument() {
	const isProd = import.meta.env.PROD;
	const app = (
		<>
			<NuqsAdapter>
				<GlobalSearchProvider>
					<AppContentShell />
					<BottomTabMenu />
				</GlobalSearchProvider>
				<Toaster richColors position="top-center" />
				<TanStackRouterDevtools position="bottom-left" />
				<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
				<Scripts />
			</NuqsAdapter>
		</>
	);

	return (
		<html lang="en" className="dark" style={{ colorScheme: "dark" }}>
			<head>
				<style
					dangerouslySetInnerHTML={{
						__html: `
html.dark{--background:color-mix(in srgb,#0a0a0a 95%,#fff);--foreground:#f5f5f5;--border:rgba(255,255,255,.06);--card:color-mix(in srgb,var(--background) 98%,#fff);--card-foreground:#f5f5f5;--popover:color-mix(in srgb,var(--background) 98%,#fff);--popover-foreground:#f5f5f5;--input:rgba(255,255,255,.08);--ring:#737373}
html.dark body{background:var(--background);color:var(--foreground)}
html.dark *{border-color:var(--border)}`,
					}}
				/>
				<HeadContent />
			</head>
			<body className="relative">
				{isProd && env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ? (
					<DeferredPostHogProvider>{app}</DeferredPostHogProvider>
				) : (
					app
				)}
			</body>
		</html>
	);
}
