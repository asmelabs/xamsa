import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentCalverString } from "@/lib/app-release";

/** Redirect alias so `/whats-new/latest` resolves to the current CalVer release notes URL. */
export const Route = createFileRoute("/whats-new/latest")({
	beforeLoad: () => {
		throw redirect({
			to: "/whats-new/$version",
			params: { version: getCurrentCalverString() },
		});
	},
});
