import { describe, expect, it } from "vitest";
import {
	getDailyAiGenerationLimit,
	startOfNextUtcDay,
	startOfUtcDay,
} from "./ai-limits";

describe("getDailyAiGenerationLimit", () => {
	it("returns expected caps by role", () => {
		expect(getDailyAiGenerationLimit("user")).toBe(3);
		expect(getDailyAiGenerationLimit("moderator")).toBe(10);
		expect(getDailyAiGenerationLimit("admin")).toBe(50);
	});
});

describe("startOfUtcDay", () => {
	it("returns midnight UTC for a wall-clock instant", () => {
		const d = new Date("2026-04-22T15:30:00.000Z");
		const s = startOfUtcDay(d);
		expect(s.toISOString()).toBe("2026-04-22T00:00:00.000Z");
	});
});

describe("startOfNextUtcDay", () => {
	it("returns 24h after start of the same UTC day", () => {
		const d = new Date("2026-04-22T12:00:00.000Z");
		expect(startOfNextUtcDay(d).toISOString()).toBe("2026-04-23T00:00:00.000Z");
	});
});
