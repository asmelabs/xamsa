"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Keeps PostHog person properties in sync with Better Auth: identify on any
 * authenticated session (including returning visitors) and reset only after a
 * real logout / session loss, not while the session is still loading.
 */
export function PostHogAuthSync() {
	const posthog = usePostHog();
	const { data: session, isPending } = authClient.useSession();
	const wasIdentifiedRef = useRef(false);

	useEffect(() => {
		if (!posthog || isPending) {
			return;
		}

		const user = session?.user;
		if (user) {
			const username = (user as { username?: string | null }).username;
			posthog.identify(user.id, {
				email: user.email,
				username: username ?? undefined,
				name: user.name,
			});
			wasIdentifiedRef.current = true;
			return;
		}

		if (wasIdentifiedRef.current) {
			posthog.reset();
			wasIdentifiedRef.current = false;
		}
	}, [posthog, session, isPending]);

	return null;
}
