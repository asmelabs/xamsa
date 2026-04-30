import path from "node:path";

import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({
	path: "../../apps/web/.env",
});

/**
 * Prisma CLI (migrate, introspect, etc.) needs a real PostgreSQL session for
 * advisory locks. Neon’s pooled URL (`-pooler` host) can time out with P1002 on
 * `pg_advisory_lock`. Use DIRECT_URL (non-pooler) when available; fall back to
 * DATABASE_URL for local/dev single URLs.
 *
 * `connect_timeout` helps when Neon compute is suspended (wake can exceed defaults).
 */
function prismaCliDatabaseUrl(): string {
	const direct = process.env.DIRECT_URL?.trim();
	const raw = direct || env("DATABASE_URL");
	return withMigrateConnectionParams(raw);
}

function withMigrateConnectionParams(url: string): string {
	try {
		const u = new URL(url);
		if (!u.searchParams.has("connect_timeout")) {
			u.searchParams.set("connect_timeout", "60");
		}
		return u.href;
	} catch {
		return url;
	}
}

export default defineConfig({
	schema: path.join("prisma", "schema"),
	migrations: {
		path: path.join("prisma", "migrations"),
	},
	datasource: {
		url: prismaCliDatabaseUrl(),
	},
});
