import { describe, expect, it } from "vitest";
import {
	computeQdrUpdate,
	ELO_AT_GAME_START_FALLBACK,
	expectedCorrect,
	K0,
	N0,
	normalizeToQdr,
	recomputePdr,
	recomputeTdr,
} from "./difficulty-rate";

describe("expectedCorrect", () => {
	it("1500 vs 1000 is ~0.78", () => {
		const p = expectedCorrect(1500, 1000);
		expect(p).toBeCloseTo(0.777, 2);
	});

	it("1000 vs 1500 is ~0.22", () => {
		const p = expectedCorrect(1000, 1500);
		expect(p).toBeCloseTo(0.223, 2);
	});
});

describe("computeQdrUpdate", () => {
	it("strong user wrong → qdrEloEquiv increases", () => {
		const a = computeQdrUpdate({
			qdrEloEquiv: 1000,
			qdrScoredAttempts: 0,
			userEloAtGameStart: 1500,
			outcome: 0,
		});
		expect(a.qdrEloEquiv).toBeGreaterThan(1000);
		expect(a.qdr).not.toBe(4.5);
		expect(a.qdr).toBeGreaterThan(4.5);
	});

	it("strong user correct on expected-easy line moves less than wrong (still can move)", () => {
		const correct = computeQdrUpdate({
			qdrEloEquiv: 1000,
			qdrScoredAttempts: 0,
			userEloAtGameStart: 1500,
			outcome: 1,
		});
		const wrong = computeQdrUpdate({
			qdrEloEquiv: 1000,
			qdrScoredAttempts: 0,
			userEloAtGameStart: 1500,
			outcome: 0,
		});
		expect(wrong.qdrEloEquiv - 1000).toBeGreaterThan(0);
		expect(1500 - correct.qdrEloEquiv).toBeGreaterThan(0);
	});

	it("weak user correct → qdrEloEquiv decreases", () => {
		const a = computeQdrUpdate({
			qdrEloEquiv: 1000,
			qdrScoredAttempts: 0,
			userEloAtGameStart: 700,
			outcome: 1,
		});
		expect(a.qdrEloEquiv).toBeLessThan(1000);
	});

	it("K damping: at 0 vs high attempts", () => {
		const at0 = K0 / (1 + 0 / N0);
		const at200 = K0 / (1 + 200 / N0);
		expect(at0).toBe(K0);
		expect(at200).toBeLessThan(K0 * 0.3);
	});

	it("null userElo uses fallback", () => {
		const a = computeQdrUpdate({
			qdrEloEquiv: 1000,
			qdrScoredAttempts: 0,
			userEloAtGameStart: null,
			outcome: 1,
		});
		const b = computeQdrUpdate({
			qdrEloEquiv: 1000,
			qdrScoredAttempts: 0,
			userEloAtGameStart: ELO_AT_GAME_START_FALLBACK,
			outcome: 1,
		});
		expect(a).toEqual(b);
	});
});

describe("normalizeToQdr", () => {
	it("anchor points", () => {
		expect(normalizeToQdr(1000)).toBe(4.5);
		expect(normalizeToQdr(555)).toBe(1);
		expect(normalizeToQdr(1665)).toBe(10);
	});

	it("clamps high elo", () => {
		expect(normalizeToQdr(2000)).toBe(10);
	});

	it("small elo drift moves stored qdr off the midpoint (two decimals)", () => {
		expect(normalizeToQdr(1002)).toBeGreaterThan(4.5);
		expect(normalizeToQdr(1002)).toBeCloseTo(4.52, 2);
	});
});

describe("recomputeTdr", () => {
	it("all fives and all scored", () => {
		expect(recomputeTdr([5, 5, 5, 5, 5], [1, 1, 1, 1, 1])).toBe(5.0);
	});

	it("no data", () => {
		expect(recomputeTdr([], [])).toBe(4.5);
	});

	it("filters zero scored attempts", () => {
		expect(recomputeTdr([5, 7, 3], [1, 1, 0])).toBe(6.0);
	});
});

describe("recomputePdr", () => {
	it("averages tdrs", () => {
		expect(recomputePdr([4, 6])).toBe(5.0);
	});

	it("empty", () => {
		expect(recomputePdr([])).toBe(4.5);
	});
});
