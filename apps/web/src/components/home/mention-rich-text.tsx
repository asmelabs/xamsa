import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Match server `@mention` tokenization; only usernames present in `mentions` become links. */
const TOKEN = /(@[a-z][a-z0-9]{2,29})(?=[^a-z0-9]|$)/g;

export function MentionRichText({
	text,
	mentions,
}: {
	text: string;
	mentions: readonly { username: string }[];
}): ReactNode {
	const mentionSet = new Set(mentions.map((m) => m.username.toLowerCase()));
	const parts: ReactNode[] = [];
	let last = 0;
	for (const m of text.matchAll(TOKEN)) {
		const start = m.index ?? 0;
		if (start > last) {
			parts.push(text.slice(last, start));
		}
		const full = m[1] ?? "";
		const uname = full.startsWith("@") ? full.slice(1) : full;
		if (uname.length > 0 && mentionSet.has(uname.toLowerCase())) {
			parts.push(
				<Link
					key={`${start}-${uname}`}
					className="font-medium text-primary hover:underline"
					params={{ username: uname }}
					to="/u/$username"
				>
					@{uname}
				</Link>,
			);
		} else {
			parts.push(full);
		}
		last = start + (m[0]?.length ?? 0);
	}
	if (last < text.length) {
		parts.push(text.slice(last));
	}
	return parts;
}
