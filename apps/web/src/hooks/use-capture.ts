/** biome-ignore-all lint/suspicious/noExplicitAny: any is used to capture any props */
import { usePostHog } from "posthog-js/react";

export function useCapture() {
	const posthog = usePostHog();

	function capture<T extends Record<string, unknown>>(
		event: string,
		properties?: T,
	) {
		if (typeof window === "undefined" || !posthog || !event) return;
		posthog.capture(event, properties);
	}

	return {
		capture,
	};
}
