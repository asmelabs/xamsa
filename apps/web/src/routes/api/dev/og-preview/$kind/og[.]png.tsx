import { createFileRoute } from "@tanstack/react-router";
import {
	isOgPreviewKind,
	mockBadgeOg,
	mockGameOg,
	mockLeaderboardOg,
	mockPackOg,
	mockReleaseOg,
	mockTopicOg,
	mockUserOg,
} from "@/lib/og/dev-mocks";
import { OG_DEV_PREVIEW_CACHE_CONTROL, ogImageResponse } from "@/lib/og/render";
import { BadgeOg } from "@/lib/og/templates/badge";
import { GameOg } from "@/lib/og/templates/game";
import { JoinOg } from "@/lib/og/templates/join";
import { LeaderboardOg } from "@/lib/og/templates/leaderboard";
import { PackOg } from "@/lib/og/templates/pack";
import { PlayOg } from "@/lib/og/templates/play";
import { ReleaseOg } from "@/lib/og/templates/release";
import { TopicOg } from "@/lib/og/templates/topic";
import { UserOg } from "@/lib/og/templates/user";

function devOnlyResponse(): Response {
	return new Response("Not found", { status: 404 });
}

export const Route = createFileRoute("/api/dev/og-preview/$kind/og.png")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				// Vite dev server: `import.meta.env.DEV` is reliable; `NODE_ENV` is not
				// always `development` in the SSR worker (e.g. under Turbo).
				if (!import.meta.env.DEV) {
					return devOnlyResponse();
				}
				const kind = params.kind;
				if (!isOgPreviewKind(kind)) {
					return new Response("Not found", { status: 404 });
				}

				const preview = { cacheControl: OG_DEV_PREVIEW_CACHE_CONTROL };
				switch (kind) {
					case "play":
						return ogImageResponse(<PlayOg />, preview);
					case "join":
						return ogImageResponse(<JoinOg />, preview);
					case "leaderboard":
						return ogImageResponse(
							<LeaderboardOg data={mockLeaderboardOg} />,
							preview,
						);
					case "pack":
						return ogImageResponse(<PackOg data={mockPackOg} />, preview);
					case "topic":
						return ogImageResponse(<TopicOg data={mockTopicOg} />, preview);
					case "user":
						return ogImageResponse(<UserOg data={mockUserOg} />, preview);
					case "game":
						return ogImageResponse(<GameOg data={mockGameOg} />, preview);
					case "badge":
						return ogImageResponse(<BadgeOg data={mockBadgeOg} />, preview);
					case "release":
						return ogImageResponse(<ReleaseOg data={mockReleaseOg} />, preview);
					default: {
						const _exhaustive: never = kind;
						return _exhaustive;
					}
				}
			},
		},
	},
});
