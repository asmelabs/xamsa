import { describe, expect, test } from "vitest";
import {
	calculateEloDeltas,
	ELO_K_BASE_DEFAULT,
	type EloPlayerRow,
} from "./elo";

function deltasObject(
	rows: EloPlayerRow[],
	opts?: Parameters<typeof calculateEloDeltas>[1],
) {
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
		expect(d.a).toBeGreaterThan(0);
	});

	test("underdog first place gains rating vs stronger average field", () => {
		const d = deltasObject([
			{ userId: "weak", rank: 1, score: 100, ratingBefore: 900 },
			{ userId: "s1", rank: 2, score: 50, ratingBefore: 1200 },
			{ userId: "s2", rank: 3, score: 0, ratingBefore: 1200 },
		]);
		expect(d.weak).toBeGreaterThan(0);
	});

	test("sums of deltas are near zero for default settings (conservation-ish)", () => {
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

	test("equal scores still rank-differentiate but with smaller deltas", () => {
		const tied = deltasObject([
			{ userId: "a", rank: 1, score: 100, ratingBefore: 1000 },
			{ userId: "b", rank: 2, score: 100, ratingBefore: 1000 },
			{ userId: "c", rank: 3, score: 100, ratingBefore: 1000 },
		]);
		const spread = deltasObject([
			{ userId: "a", rank: 1, score: 300, ratingBefore: 1000 },
			{ userId: "b", rank: 2, score: 100, ratingBefore: 1000 },
			{ userId: "c", rank: 3, score: 0, ratingBefore: 1000 },
		]);
		expect(Math.abs(tied.a as number)).toBeLessThan(
			Math.abs(spread.a as number),
		);
	});

	test("8-player table: all deltas stay within ±K_BASE", () => {
		const rows: EloPlayerRow[] = Array.from({ length: 8 }, (_, i) => ({
			userId: `p${i}`,
			rank: i + 1,
			score: (8 - i) * 100,
			ratingBefore: 1000 + (i - 3) * 50,
		}));
		const d = deltasObject(rows);
		for (const v of Object.values(d)) {
			expect(v).toBeLessThanOrEqual(ELO_K_BASE_DEFAULT);
			expect(v).toBeGreaterThanOrEqual(-ELO_K_BASE_DEFAULT);
		}
	});

	test("provisional player (low gamesPlayed) moves more than a settled one", () => {
		const provisional = deltasObject([
			{
				userId: "new",
				rank: 1,
				score: 200,
				ratingBefore: 1000,
				gamesPlayedBefore: 0,
			},
			{
				userId: "veteran",
				rank: 2,
				score: 100,
				ratingBefore: 1000,
				gamesPlayedBefore: 500,
			},
		]);
		const balanced = deltasObject([
			{
				userId: "new",
				rank: 1,
				score: 200,
				ratingBefore: 1000,
				gamesPlayedBefore: 500,
			},
			{
				userId: "veteran",
				rank: 2,
				score: 100,
				ratingBefore: 1000,
				gamesPlayedBefore: 500,
			},
		]);
		expect(Math.abs(provisional.new as number)).toBeGreaterThan(
			Math.abs(balanced.new as number),
		);
	});

	test("higher correct rate nudges delta upward", () => {
		const accurate = deltasObject([
			{
				userId: "a",
				rank: 1,
				score: 200,
				ratingBefore: 1000,
				correctAnswers: 8,
				incorrectAnswers: 1,
				expiredAnswers: 1,
			},
			{
				userId: "b",
				rank: 2,
				score: 100,
				ratingBefore: 1000,
			},
		]);
		const sloppy = deltasObject([
			{
				userId: "a",
				rank: 1,
				score: 200,
				ratingBefore: 1000,
				correctAnswers: 1,
				incorrectAnswers: 8,
				expiredAnswers: 1,
			},
			{
				userId: "b",
				rank: 2,
				score: 100,
				ratingBefore: 1000,
			},
		]);
		expect(accurate.a).toBeGreaterThan(sloppy.a as number);
	});
});
