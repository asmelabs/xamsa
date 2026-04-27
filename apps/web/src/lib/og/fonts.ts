import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

let cachedFonts:
	| { name: string; data: ArrayBuffer; weight: 400 | 700 }[]
	| null = null;

function readTtf(filename: string): ArrayBuffer {
	const buf = readFileSync(resolve(here, "fonts", filename));
	return buf.buffer.slice(
		buf.byteOffset,
		buf.byteOffset + buf.byteLength,
	) as ArrayBuffer;
}

/** Geist Sans Regular + Bold TTFs, loaded once and reused across renders. */
export function getOgFonts() {
	if (cachedFonts) return cachedFonts;
	cachedFonts = [
		{ name: "Geist", data: readTtf("Geist-Regular.ttf"), weight: 400 },
		{ name: "Geist", data: readTtf("Geist-Bold.ttf"), weight: 700 },
	];
	return cachedFonts;
}
