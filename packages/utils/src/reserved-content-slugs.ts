/**
 * URL path segments reserved for core app routes. Pack, topic, and question
 * slugs must never match these after slugification from user-facing titles.
 *
 * Keeps `@xamsa/utils` routing-related constants in one place.
 */
export const RESERVED_CONTENT_SLUG_LIST = [
	"3sual",
	"ai",
	"all",
	"api",
	"auth",
	"badge",
	"badges",
	"bulk-new",
	"bulk",
	"buzz",
	"buzzes",
	"click",
	"code",
	"clicks",
	"create",
	"dashboard",
	"delete",
	"dev",
	"edit",
	"exports",
	"export",
	"game",
	"history",
	"imports",
	"import",
	"index",
	"jobs",
	"job",
	"join",
	"latest",
	"leaderboard",
	"legal",
	"login",
	"new",
	"og",
	"package",
	"packs",
	"pack",
	"play",
	"plays",
	"privacy-policy",
	"profile",
	"question",
	"questions",
	"register",
	"roadmap",
	"robots",
	"rpc",
	"search",
	"security",
	"settings",
	"sitemap",
	"terms-of-service",
	"topic",
	"topics",
	"top",
	"update",
	"users",
	"user",
	"whats-new",
] as const;

const RESERVED = new Set<string>(RESERVED_CONTENT_SLUG_LIST);

export function isReservedContentSlug(slug: string): boolean {
	return RESERVED.has(slug.trim().toLowerCase());
}
