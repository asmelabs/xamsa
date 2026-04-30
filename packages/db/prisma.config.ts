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
 */
function prismaCliDatabaseUrl(): string {
	const direct = process.env.DIRECT_URL?.trim();
	if (direct) return direct;
	return env("DATABASE_URL");
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
