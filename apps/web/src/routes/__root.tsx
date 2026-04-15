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
				title: "Xamsa",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
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
				<div className="relative isolate min-h-svh pb-16">
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
		<html lang="en" className="dark">
			<head>
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
