import { BadgeIdSchema } from "@xamsa/schemas/modules/badge";
import type { HomeSearchItemType } from "@xamsa/schemas/modules/search";
import type {
	GlobalLeaderboardBoardType,
	LeaderboardPeriodType,
} from "@xamsa/schemas/modules/user";
import { parseCalverParam } from "@xamsa/utils/app-release-calver";
import { getCurrentCalverString } from "@/lib/app-release";

export type HomeSearchCommandContext = {
	isSignedIn: boolean;
	isStaff: boolean;
	/** Signed-in user's username (`null` when guest). Used for shortcuts like profile. */
	viewerUsername: string | null;
	hasActiveGame: boolean;
	activeGameCode: string | null;
};

export type HomeSearchQueryAnalysis = {
	staticItems: HomeSearchItemType[];
	fetchDraftPacks: boolean;
	fetchHostPacks: boolean;
	fetchJoinLobbies: boolean;
};

const LEADERBOARD_BOARDS = [
	"elo",
	"xp",
	"wins",
	"hosts",
	"plays",
] as const satisfies readonly GlobalLeaderboardBoardType[];

const LEADERBOARD_PERIODS = [
	"week",
	"month",
	"year",
	"all",
] as const satisfies readonly LeaderboardPeriodType[];

function isLeaderboardBoard(tab: string): tab is GlobalLeaderboardBoardType {
	return (LEADERBOARD_BOARDS as readonly string[]).includes(tab);
}

function isLeaderboardPeriod(p: string): p is LeaderboardPeriodType {
	return (LEADERBOARD_PERIODS as readonly string[]).includes(p);
}

export function pageItem(
	title: string,
	description: string | null,
	to: string,
	search?: Record<string, string>,
): HomeSearchItemType {
	const base = {
		kind: "page" as const,
		title,
		description,
		to,
	};
	if (search && Object.keys(search).length > 0) {
		return { ...base, search };
	}
	return base;
}

function resumeGameRow(
	ctx: HomeSearchCommandContext,
): HomeSearchItemType | null {
	if (!ctx.hasActiveGame || !ctx.activeGameCode) return null;
	return pageItem(
		"Resume your game",
		`Code ${ctx.activeGameCode}`,
		`/g/${ctx.activeGameCode}`,
	);
}

const DASHBOARD_SEGMENTS: Record<
	string,
	{ to: string; title: string; description: string }
> = {
	packs: {
		to: "/dashboard/packs/",
		title: "Dashboard · Packs",
		description: "Staff pack list",
	},
	users: {
		to: "/dashboard/users/",
		title: "Dashboard · Users",
		description: "Staff user list",
	},
	games: {
		to: "/dashboard/games/",
		title: "Dashboard · Games",
		description: "Staff game list",
	},
	topics: {
		to: "/dashboard/topics/",
		title: "Dashboard · Topics",
		description: "Staff topic list",
	},
	questions: {
		to: "/dashboard/questions/",
		title: "Dashboard · Questions",
		description: "Staff question list",
	},
	clicks: {
		to: "/dashboard/clicks/",
		title: "Dashboard · Clicks",
		description: "Staff click events",
	},
	jobs: {
		to: "/dashboard/jobs/",
		title: "Dashboard · Jobs",
		description: "Bulk import jobs",
	},
	badges: {
		to: "/dashboard/badges/",
		title: "Dashboard · Badges",
		description: "Staff badge catalog",
	},
};

function staffDashboardItems(normalized: string): HomeSearchItemType[] {
	if (normalized === "dashboard") {
		return [
			pageItem("Staff dashboard", "Moderator and admin tools", "/dashboard/"),
		];
	}
	const prefix = "dashboard/";
	if (!normalized.startsWith(prefix)) return [];
	const rest = normalized.slice(prefix.length).trim();
	const segment = rest.split("/")[0] ?? "";
	if (!segment || !(segment in DASHBOARD_SEGMENTS)) return [];
	const meta = DASHBOARD_SEGMENTS[segment];
	return [pageItem(meta.title, meta.description, meta.to)];
}

/**
 * Static/routed shortcuts from the raw query (trimmed). Lowercases only for matching;
 * join codes preserve original casing from `rawTrimmed`.
 */
export function analyzeHomeSearchQuery(
	rawTrimmed: string,
	ctx: HomeSearchCommandContext,
): HomeSearchQueryAnalysis {
	const empty: HomeSearchQueryAnalysis = {
		staticItems: [],
		fetchDraftPacks: false,
		fetchHostPacks: false,
		fetchJoinLobbies: false,
	};

	const n = rawTrimmed.toLowerCase();

	if (ctx.isSignedIn && ctx.isStaff) {
		const dash = staffDashboardItems(n);
		if (dash.length > 0) {
			return { ...empty, staticItems: dash };
		}
	}

	if (!ctx.isSignedIn) {
		if (n === "login") {
			return {
				...empty,
				staticItems: [
					pageItem("Log in", "Sign in to your account", "/auth/login"),
				],
			};
		}
		if (n === "register") {
			return {
				...empty,
				staticItems: [
					pageItem("Register", "Create an account", "/auth/register"),
				],
			};
		}
	}

	if (n === "join:game" || n === "join") {
		const resume = resumeGameRow(ctx);
		if (resume) {
			return { ...empty, staticItems: [resume] };
		}
		if (ctx.isSignedIn) {
			return { ...empty, fetchJoinLobbies: true };
		}
		return empty;
	}

	const joinMatch = /^join:(.+)$/.exec(n);
	if (joinMatch?.[1] && joinMatch[1] !== "game") {
		const codeRaw = rawTrimmed.slice("join:".length).trim();
		if (!codeRaw) return empty;
		return {
			...empty,
			staticItems: [
				pageItem(`Join ${codeRaw}`, "Open join flow", `/join/${codeRaw}/`),
			],
		};
	}

	if (n === "create:pack") {
		return {
			...empty,
			staticItems: [
				pageItem("Create a pack", "Start a new question pack", "/packs/new/"),
			],
		};
	}

	if (n === "create:topic") {
		if (!ctx.isSignedIn) return empty;
		return { ...empty, fetchDraftPacks: true };
	}

	if (n === "create:game") {
		const resume = resumeGameRow(ctx);
		if (resume) {
			return { ...empty, staticItems: [resume] };
		}
		if (ctx.isSignedIn) {
			return { ...empty, fetchHostPacks: true };
		}
		return empty;
	}

	if (n === "leaderboard" || n.startsWith("leaderboard:")) {
		if (n === "leaderboard") {
			return {
				...empty,
				staticItems: [
					pageItem("Leaderboard", "Global rankings", "/leaderboard/"),
				],
			};
		}
		const rest = n.slice("leaderboard:".length).trim();
		if (!rest) {
			return {
				...empty,
				staticItems: [
					pageItem("Leaderboard", "Global rankings", "/leaderboard/"),
				],
			};
		}
		// Accept `leaderboard:<board>`, `leaderboard:<period>`, or `leaderboard:<board>:<period>`.
		const parts = rest
			.split(":")
			.map((s) => s.trim())
			.filter(Boolean);
		let board: GlobalLeaderboardBoardType | null = null;
		let period: LeaderboardPeriodType | null = null;
		for (const piece of parts) {
			if (!board && isLeaderboardBoard(piece)) {
				board = piece;
				continue;
			}
			if (!period && isLeaderboardPeriod(piece)) {
				period = piece;
			}
		}
		if (!board && !period) {
			return {
				...empty,
				staticItems: [
					pageItem("Leaderboard", "Global rankings", "/leaderboard/"),
				],
			};
		}
		const search: Record<string, string> = {};
		if (board) search.tab = board;
		if (period) search.period = period;
		const labelBits = [board, period].filter(Boolean).join(" · ");
		return {
			...empty,
			staticItems: [
				pageItem(
					`Leaderboard (${labelBits})`,
					"Open rankings",
					"/leaderboard/",
					search,
				),
			],
		};
	}

	if (n === "play") {
		return {
			...empty,
			staticItems: [pageItem("Play", "Host or join a game", "/play/")],
		};
	}

	if (n === "history") {
		return {
			...empty,
			staticItems: [pageItem("History", "Your recent games", "/history/")],
		};
	}

	if (ctx.isSignedIn && ctx.viewerUsername && n === "profile") {
		const u = ctx.viewerUsername;
		return {
			...empty,
			staticItems: [pageItem("My profile", `Open @${u}`, `/u/${u}/`)],
		};
	}

	if (n === "settings" || n.startsWith("settings:")) {
		if (n === "settings") {
			return {
				...empty,
				staticItems: [
					pageItem("Settings", "Profile and account", "/settings/"),
				],
			};
		}
		const seg = n.slice("settings:".length).trim().toLowerCase();
		if (seg === "security") {
			return {
				...empty,
				staticItems: [
					pageItem(
						"Security settings",
						"Password, email, and linked accounts",
						"/settings/security/",
					),
				],
			};
		}
		return {
			...empty,
			staticItems: [pageItem("Settings", "Profile and account", "/settings/")],
		};
	}

	if (n === "badges" || n.startsWith("badges:")) {
		if (n === "badges") {
			return {
				...empty,
				staticItems: [pageItem("Badges", "Achievements", "/badges/")],
			};
		}
		const idPart = rawTrimmed.slice("badges:".length).trim();
		if (!idPart) {
			return {
				...empty,
				staticItems: [pageItem("Badges", "Achievements", "/badges/")],
			};
		}
		const parsed = BadgeIdSchema.safeParse(idPart);
		if (!parsed.success) {
			return {
				...empty,
				staticItems: [pageItem("Badges", "Achievements", "/badges/")],
			};
		}
		return {
			...empty,
			staticItems: [
				pageItem(
					`Badge · ${parsed.data}`,
					"Open badge details",
					`/badges/${parsed.data}/`,
				),
			],
		};
	}

	if (ctx.isSignedIn && n === "logout") {
		return {
			...empty,
			staticItems: [
				{
					kind: "action",
					action: "logout",
					title: "Log out",
					description: "Sign out and return to home",
				},
			],
		};
	}

	if (n === "privacy" || n === "privacy-policy") {
		return {
			...empty,
			staticItems: [pageItem("Privacy policy", null, "/legal/privacy-policy/")],
		};
	}

	if (n === "terms" || n === "terms-of-service") {
		return {
			...empty,
			staticItems: [
				pageItem("Terms of service", null, "/legal/terms-of-service/"),
			],
		};
	}

	if (n === "whats-new" || n.startsWith("whats-new:")) {
		if (n === "whats-new") {
			return {
				...empty,
				staticItems: [pageItem("What's new", "Release notes", "/whats-new/")],
			};
		}
		const verPart = rawTrimmed.slice("whats-new:".length).trim();
		if (!verPart) {
			return {
				...empty,
				staticItems: [pageItem("What's new", "Release notes", "/whats-new/")],
			};
		}
		if (verPart.toLowerCase() === "latest") {
			const pathVer = getCurrentCalverString();
			return {
				...empty,
				staticItems: [
					pageItem(
						`What's new · v${pathVer} (latest)`,
						"Release notes",
						`/whats-new/${pathVer}/`,
					),
				],
			};
		}
		const cal = parseCalverParam(verPart);
		if (!cal) {
			return {
				...empty,
				staticItems: [pageItem("What's new", "Release notes", "/whats-new/")],
			};
		}
		const yy = cal.year % 100;
		const mm = String(cal.month).padStart(2, "0");
		const pathVer = `${yy}.${mm}.${cal.patch}`;
		return {
			...empty,
			staticItems: [
				pageItem(
					`What's new · v${pathVer}`,
					"Release notes",
					`/whats-new/${pathVer}/`,
				),
			],
		};
	}

	return empty;
}
