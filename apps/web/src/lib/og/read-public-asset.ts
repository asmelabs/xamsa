import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Resolve `apps/web/public/...` whether Vite cwd is `apps/web` or the monorepo root. */
export function readPublicBinary(...segments: string[]): Buffer {
	const candidates = [
		resolve(process.cwd(), "public", ...segments),
		resolve(process.cwd(), "apps/web/public", ...segments),
	];
	for (const p of candidates) {
		if (existsSync(p)) {
			return readFileSync(p);
		}
	}
	throw new Error(
		`Public asset not found: ${segments.join("/")} (checked public/ under cwd and apps/web/public/)`,
	);
}
