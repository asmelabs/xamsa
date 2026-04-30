#!/usr/bin/env bun
/**
 * Runs `prisma migrate deploy` with retries. P1002 (advisory lock timeout) can
 * happen when two deploys overlap or Neon/schema-engine timing is tight; Prisma’s
 * lock wait is fixed at 10s so a short pause and retry often succeeds.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const dbRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const maxAttempts = Math.max(
	1,
	Number(process.env.PRISMA_MIGRATE_DEPLOY_ATTEMPTS ?? "5"),
);
const delayMs = Math.max(
	0,
	Number(process.env.PRISMA_MIGRATE_DEPLOY_RETRY_DELAY_MS ?? "20000"),
);

async function main() {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const result = spawnSync("bunx", ["prisma", "migrate", "deploy"], {
			cwd: dbRoot,
			stdio: "inherit",
			env: process.env,
		});

		if (result.status === 0) {
			process.exit(0);
		}

		if (attempt < maxAttempts) {
			console.error(
				`\n[prisma migrate deploy] exit ${result.status} (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs / 1000}s…\n`,
			);
			await sleep(delayMs);
		}
	}

	process.exit(1);
}

main();
