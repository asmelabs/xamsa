"use client";

import { env } from "@xamsa/env/web";
import { PostHogProvider } from "posthog-js/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PostHogAuthSync } from "@/components/posthog-auth-sync";

const postHogOptions = {
	api_host: env.VITE_PUBLIC_POSTHOG_HOST,
	defaults: "2026-01-30",
} as const;

export function DeferredPostHogProvider({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false);
	const token = env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;

	// VITE_PUBLIC_* is fixed at build time.
	useEffect(() => {
		if (!token) {
			return;
		}
		let cancelled = false;
		let idleId: number | undefined;
		let timeoutId: number | undefined;

		if (typeof window.requestIdleCallback === "function") {
			idleId = window.requestIdleCallback(() => {
				if (!cancelled) {
					setReady(true);
				}
			});
		} else {
			timeoutId = window.setTimeout(() => {
				if (!cancelled) {
					setReady(true);
				}
			}, 1);
		}

		return () => {
			cancelled = true;
			if (
				idleId !== undefined &&
				typeof window.cancelIdleCallback === "function"
			) {
				window.cancelIdleCallback(idleId);
			}
			if (timeoutId !== undefined) {
				window.clearTimeout(timeoutId);
			}
		};
	}, []);

	if (!token) {
		return children;
	}

	if (!ready) {
		return children;
	}

	return (
		<PostHogProvider apiKey={token} options={postHogOptions}>
			<PostHogAuthSync />
			{children}
		</PostHogProvider>
	);
}
