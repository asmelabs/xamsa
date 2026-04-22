import { describe, expect, test } from "vitest";
import { calculateEloDeltas, type EloPlayerRow } from "./elo";

function deltasObject(rows: EloPlayerRow[], opts?: Parameters<typeof calculateEloDeltas>[1]) {
	const m = calculateEloDeltas(rows, opts);
	return Object.fromEntries(m);
}

describe("calculateEloDeltas", () => {
	test("returns empty map when forceAborted", () => {
		const rows: EloPlayerRow[] = [
			{ userId: "a", rank: 1, score: 100, ratingBefore: 1000 },
			{ userId: "b", rank: 2, score: 50, ratingBefore: 1000 },
		];
		expect(calculateEloDeltas(rows, { forceAborted: true }).size).toBe(0);
	});

	test("returns empty map when fewer than 2 players", () => {
		expect(
			calculateEloDeltas([
				{ userId: "a", rank: 1, score: 10, ratingBefore: 1000 },
			]).size,
		).toBe(0);
		expect(calculateEloDeltas([]).size).toBe(0);
	});

	test("last place loses rating in a balanced field", () => {
		const d = deltasObject([
			{ userId: "a", rank: 1, score: 300, ratingBefore: 1000 },
			{ userId: "b", rank: 2, score: 200, ratingBefore: 1000 },
			{ userId: "c", rank: 3, score: 100, ratingBefore: 1000 },
		]);
		expect(d.c).toBeLessThan(0);
	});

	test("underdog first place gains rating vs stronger average field", () => {
		const d = deltasObject([
			{ userId: "weak", rank: 1, score: 100, ratingBefore: 900 },
			{ userId: "s1", rank: 2, score: 50, ratingBefore: 1200 },
			{ userId: "s2", rank: 3, score: 0, ratingBefore: 1200 },
		]);
		expect(d.weak).toBeGreaterThan(0);
	});

	test("sums of deltas are near zero for same K (conservation-ish)", () => {
		const rows: EloPlayerRow[] = [
			{ userId: "a", rank: 1, score: 80, ratingBefore: 1100 },
			{ userId: "b", rank: 2, score: 60, ratingBefore: 1000 },
			{ userId: "c", rank: 3, score: 40, ratingBefore: 900 },
		];
		const m = calculateEloDeltas(rows);
		let sum = 0;
		for (const v of m.values()) sum += v;
		expect(Math.abs(sum)).toBeLessThanOrEqual(2);
	});
});
