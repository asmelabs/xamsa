"use client";

import { Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@xamsa/ui/lib/utils";

/**
 * Default app column is narrow; `/dashboard` gets a wider max width for staff tables.
 */
export function AppContentShell() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isDashboard = pathname.startsWith("/dashboard");

	return (
		<div
			className={cn(
				"relative isolate mx-auto min-h-svh px-4 py-4 pb-16 md:px-6",
				isDashboard ? "max-w-7xl" : "max-w-4xl md:px-0",
			)}
		>
			<Outlet />
		</div>
	);
}
