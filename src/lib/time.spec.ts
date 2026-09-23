import { describe, expect, it } from "vitest";
import { addMinutes, diffMinutes, formatClock, isValidIsoDate, nextDays } from "./time.js";

describe("time helpers", () => {
  it("adds and diffs minutes", () => {
    const start = new Date("2026-09-23T12:00:00");
    const end = addMinutes(start, 95);
    expect(diffMinutes(end, start)).toBe(95);
  });

  it("formats clock", () => {
    expect(formatClock(new Date("2026-09-23T09:05:00"))).toBe("09:05");
  });

  it("validates iso dates", () => {
    expect(isValidIsoDate("2026-09-23")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("23-09-2026")).toBe(false);
  });

  it("lists next days", () => {
    const days = nextDays(3, "2026-09-23");
    expect(days).toEqual(["2026-09-23", "2026-09-24", "2026-09-25"]);
  });
});
