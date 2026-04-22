/**
 * Side-effect only: load `apps/web/.env` (and optional `.env.local`) into `process.env`
 * using this file’s directory — not `process.cwd()` — so it works for root vs app cwd
 * (e.g. `turbo dev` from the monorepo root) before any `@xamsa/*` code reads `env`.
 *
 * Imported first from `vite.config.ts` so dev / SSR API routes (e.g. /api/rpc) see
 * the same keys as a deployment’s injected environment. Not a `createServerFn`;
 * secrets for RPC are still `process.env` on the server.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const appWebRoot = dirname(fileURLToPath(import.meta.url));

const envMain = join(appWebRoot, ".env");
const envLocal = join(appWebRoot, ".env.local");

if (existsSync(envMain)) {
	void config({ path: envMain });
}
if (existsSync(envLocal)) {
	void config({ path: envLocal, override: true });
}
