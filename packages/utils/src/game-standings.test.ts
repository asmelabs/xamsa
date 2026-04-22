import { describe, expect, it } from "vitest";
import {
	compareStandingsOrder,
	competitionRanksFromSorted,
	tiedForStandingsMetrics,
} from "./game-standings";

const d = (s: string) => new Date(s);

describe("compareStandingsOrder", () => {
	it("orders by score first", () => {
		expect(
			compareStandingsOrder(
				{
					score: 1,
					correctAnswers: 0,
					incorrectAnswers: 0,
					totalClicks: 0,
					joinedAt: d("2026-01-01"),
				},
				{
					score: 2,
					correctAnswers: 0,
					incorrectAnswers: 0,
					totalClicks: 0,
					joinedAt: d("2026-01-01"),
				},
			),
		).toBeGreaterThan(0);
	});

	it("uses fewer incorrect answers when score and correct tie", () => {
		expect(
			compareStandingsOrder(
				{
					score: 100,
					correctAnswers: 5,
					incorrectAnswers: 2,
					totalClicks: 10,
					joinedAt: d("2026-01-01"),
				},
				{
					score: 100,
					correctAnswers: 5,
					incorrectAnswers: 3,
					totalClicks: 10,
					joinedAt: d("2026-01-01"),
				},
			),
		).toBeLessThan(0);
	});

	it("uses more totalClicks when higher metrics tie", () => {
		expect(
			compareStandingsOrder(
				{
					score: 100,
					correctAnswers: 5,
					incorrectAnswers: 2,
					totalClicks: 8,
					joinedAt: d("2026-01-02"),
				},
				{
					score: 100,
					correctAnswers: 5,
					incorrectAnswers: 2,
					totalClicks: 10,
					joinedAt: d("2026-01-01"),
				},
			),
		).toBeGreaterThan(0);
	});
});

describe("competitionRanksFromSorted", () => {
	it("assigns shared rank on ties", () => {
		const row = (score: number, joined: string) => ({
			score,
			correctAnswers: 0,
			incorrectAnswers: 0,
			totalClicks: 0,
			joinedAt: d(joined),
		});
		const sorted = [
			row(300, "2026-01-01"),
			row(300, "2026-01-02"),
			row(100, "2026-01-03"),
		];
		expect(tiedForStandingsMetrics(sorted[0]!, sorted[1]!)).toBe(true);
		expect(competitionRanksFromSorted(sorted)).toEqual([1, 1, 3]);
	});
});
