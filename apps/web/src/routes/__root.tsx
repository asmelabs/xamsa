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
import { PostHogProvider } from "posthog-js/react";
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
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body className="relative">
				<PostHogProvider
					apiKey={env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN}
					options={postHogOptions}
				>
					<div className="relative isolate grid h-svh grid-rows-[auto_1fr]">
						<Outlet />
					</div>
					<Toaster richColors />
					<TanStackRouterDevtools position="bottom-left" />
					<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
					<Scripts />
				</PostHogProvider>
			</body>
		</html>
	);
}
