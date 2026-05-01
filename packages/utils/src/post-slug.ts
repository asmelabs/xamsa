import { slugify } from "./slugify";

/**
 * Memorizable hyphenated slug pieces (ASCII) for posts without usable body text.
 * Combined as 3–4 random distinct words when deriving a slug.
 */
const POST_SLUG_WORDS = [
	"amber",
	"anchor",
	"aurora",
	"autumn",
	"beacon",
	"breeze",
	"canvas",
	"cedar",
	"canyon",
	"cipher",
	"cloud",
	"compass",
	"cosmos",
	"delta",
	"ember",
	"echo",
	"frost",
	"glacier",
	"harbor",
	"harvest",
	"lantern",
	"ledger",
	"marble",
	"maple",
	"meadow",
	"melody",
	"morrow",
	"nebula",
	"nova",
	"opal",
	"orbit",
	"pixel",
	"prairie",
	"quartz",
	"quest",
	"raven",
	"rhythm",
	"river",
	"signal",
	"spark",
	"spring",
	"stone",
	"summer",
	"swift",
	"thread",
	"wander",
	"willow",
	"winter",
] as const;

function distinctRandomWords(count: number): string[] {
	const pool = [...new Set(POST_SLUG_WORDS)];
	const out: string[] = [];
	let remaining = Math.min(count, pool.length);
	while (remaining-- > 0 && pool.length > 0) {
		const idx = Math.floor(Math.random() * pool.length);
		const [w] = pool.splice(idx, 1);
		if (w) out.push(w);
	}
	return out;
}

/** 3–4 random words → `like-this-example` */
export function randomMeaningfulPostSlugBase(): string {
	const count = Math.random() < 0.5 ? 3 : 4;
	return distinctRandomWords(count).join("-") || "xamsa-post";
}

/** First line / paragraph → slug-ish seed; fallback to random words if empty / too short. */
export function derivePostSlugSeedFromBody(
	body: string | null | undefined,
): string {
	const trimmed = body?.trim();
	if (!trimmed) {
		return randomMeaningfulPostSlugBase();
	}
	const firstLine =
		trimmed
			.split(/\r?\n/)
			.find((line) => line.trim().length > 0)
			?.trim() ?? trimmed;
	const slug = slugify(firstLine.slice(0, 500)).slice(0, 120);
	if (slug.length >= 3) {
		return slug;
	}
	return randomMeaningfulPostSlugBase();
}
