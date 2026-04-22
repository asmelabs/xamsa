import { describe, expect, test } from "vitest";
import {
	getLevelFromXp,
	getLevelProgress,
	getXpThreshold,
	LEVEL_DEFINITIONS,
	MAX_LEVEL,
} from "./levels";

describe("getLevelFromXp", () => {
	test("0 XP is level 1", () => {
		expect(getLevelFromXp(0)).toBe(1);
	});

	test("monotonic: thresholds move to next level", () => {
		for (let L = 1; L < MAX_LEVEL; L++) {
			const min = getXpThreshold(L);
			const next = getXpThreshold(L + 1);
			expect(getLevelFromXp(min)).toBe(L);
			expect(getLevelFromXp(next - 1)).toBe(L);
			expect(getLevelFromXp(next)).toBe(L + 1);
		}
	});

	test("max level stays capped", () => {
		const top = LEVEL_DEFINITIONS[MAX_LEVEL - 1]?.minXp ?? 0;
		expect(getLevelFromXp(top)).toBe(MAX_LEVEL);
		expect(getLevelFromXp(top + 9_999_999)).toBe(MAX_LEVEL);
	});
});

describe("getLevelProgress", () => {
	test("start of a level has 0 pct (non-max)", () => {
		const L = 3;
		const min = getXpThreshold(L);
		const p = getLevelProgress(min);
		expect(p.level).toBe(L);
		expect(p.pct).toBe(0);
		expect(p.isMaxLevel).toBe(false);
	});

	test("just below next threshold is high pct", () => {
		const minL2 = getXpThreshold(2);
		const p = getLevelProgress(minL2 - 1);
		expect(p.level).toBe(1);
		expect(p.pct).toBeGreaterThan(0.99);
	});

	test("max level reports full bar", () => {
		const top = LEVEL_DEFINITIONS[MAX_LEVEL - 1]?.minXp ?? 0;
		const p = getLevelProgress(top);
		expect(p.isMaxLevel).toBe(true);
		expect(p.pct).toBe(1);
		expect(p.xpForCurrentLevel).toBe(0);
	});
});
