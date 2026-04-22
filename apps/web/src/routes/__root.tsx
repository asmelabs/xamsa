import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { env } from "@xamsa/env/web";
import { Toaster } from "@xamsa/ui/components/sonner";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { PostHogProvider } from "posthog-js/react";
import { BottomTabMenu } from "@/components/bottom-tab-menu";
import { rootIconLinks } from "@/lib/seo";
import type { orpc } from "@/utils/orpc";
import appCss from "../index.css?url";

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1; user-scalable=no",
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
				rel: "stylesheet",
				href: appCss,
			},
			...rootIconLinks(),
		],
	}),

	component: RootDocument,
});

const postHogOptions = {
	api_host: env.VITE_PUBLIC_POSTHOG_HOST,
	defaults: "2026-01-30",
} as const;

function RootDocument() {
	const isProd = import.meta.env.PROD;
	const app = (
		<>
			<NuqsAdapter>
				<div className="relative isolate mx-auto min-h-svh max-w-4xl px-4 py-4 pb-16 md:px-0">
					<Outlet />
					<BottomTabMenu />
				</div>
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
					<PostHogProvider
						apiKey={env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN}
						options={postHogOptions}
					>
						{app}
					</PostHogProvider>
				) : (
					app
				)}
			</body>
		</html>
	);
}
