import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUserInboxChannel } from "@/hooks/use-user-inbox-channel";

/**
 * Lives in `__root` so the bell badge updates instantly across tabs
 * the moment a notification is created server-side. Reads the session
 * id from router context (no extra fetch) and is a no-op when signed
 * out.
 *
 * Also wires the global `⌘/Ctrl+B` shortcut that opens the full
 * notifications page (mirrors the `⌘/Ctrl+K` global search affordance —
 * `N` is reserved by every browser for "new window").
 */
export function UserInboxChannelMount() {
	const userId = useRouterState({
		select: (s) => s.matches[0]?.context.session?.user?.id ?? null,
	});
	const navigate = useNavigate();
	useUserInboxChannel(userId);

	useEffect(() => {
		if (!userId) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() !== "b") return;
			if (!e.metaKey && !e.ctrlKey) return;
			// Skip when an input/textarea is focused so it doesn't fight a real
			// `Ctrl+B` for bold inside post / comment composers.
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}
			e.preventDefault();
			void navigate({ to: "/notifications" });
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [navigate, userId]);

	return null;
}
