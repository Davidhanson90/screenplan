import { describe, expect, it } from "vitest";
import {
  generateItineraries,
  planToPlainText,
  sortPlans,
  summarizePlan
} from "./itinerary.js";
import type { Film, Screening } from "../types.js";

const films: Film[] = [
  { id: "a", length: 100, link: "", name: "Alpha", posterLink: "", releaseYear: "2026", videoLink: "", weight: 1 },
  { id: "b", length: 90, link: "", name: "Beta", posterLink: "", releaseYear: "2026", videoLink: "", weight: 2 },
  { id: "c", length: 80, link: "", name: "Gamma", posterLink: "", releaseYear: "2026", videoLink: "", weight: 3 }
];

function screening(id: string, filmId: string, iso: string): Screening {
  return {
    id,
    filmId,
    eventDateTime: iso,
    attributeIds: ["2d"],
    bookingLink: `https://book.example/${id}`,
    businessDay: iso.slice(0, 10),
    cinemaId: "X0001",
    soldOut: false
  };
}

describe("itinerary generator", () => {
  it("builds segments with breaks", () => {
    const plan = summarizePlan(
      [
        screening("1", "a", "2026-09-23T12:00:00"),
        screening("2", "b", "2026-09-23T15:00:00")
      ],
      films,
      30
    );
    // 12:00 + 130 = 14:10, next at 15:00 => 50 min break
    expect(plan.hasOverlap).toBe(false);
    expect(plan.totalWaitMinutes).toBe(50);
    expect(plan.segments.some((s) => s.kind === "break")).toBe(true);
  });

  it("detects overlaps", () => {
    const plan = summarizePlan(
      [
        screening("1", "a", "2026-09-23T12:00:00"),
        screening("2", "b", "2026-09-23T13:00:00")
      ],
      films,
      30
    );
    expect(plan.hasOverlap).toBe(true);
  });

  it("generates multi-film plans and respects must-include", () => {
    const candidates = [
      screening("a1", "a", "2026-09-23T10:00:00"),
      screening("a2", "a", "2026-09-23T14:00:00"),
      screening("b1", "b", "2026-09-23T12:30:00"),
      screening("c1", "c", "2026-09-23T15:30:00")
    ];
    const plans = generateItineraries(candidates, films, {
      trailerMinutes: 30,
      maxBreakMinutes: 90,
      sort: "fewest-wait"
    });
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.every((p) => p.screenings.length >= 2)).toBe(true);

    const locked = generateItineraries(candidates, films, {
      trailerMinutes: 30,
      maxBreakMinutes: 90,
      mustIncludeFilmIds: ["c"]
    });
    expect(locked.every((p) => p.screenings.some((s) => s.filmId === "c"))).toBe(true);
  });

  it("sorts plans", () => {
    const p1 = summarizePlan(
      [screening("1", "a", "2026-09-23T10:00:00"), screening("2", "b", "2026-09-23T13:00:00")],
      films,
      0
    );
    const p2 = summarizePlan(
      [screening("3", "a", "2026-09-23T10:00:00"), screening("4", "b", "2026-09-23T12:00:00")],
      films,
      0
    );
    const sorted = sortPlans([p1, p2], "fewest-wait");
    expect(sorted[0]!.totalWaitMinutes).toBeLessThanOrEqual(sorted[1]!.totalWaitMinutes);
  });

  it("formats plain text", () => {
    const plan = summarizePlan(
      [screening("1", "a", "2026-09-23T10:00:00"), screening("2", "b", "2026-09-23T13:00:00")],
      films,
      30
    );
    const text = planToPlainText(plan, "Test Cinema", "2026-09-23", 10);
    expect(text).toContain("screenplan");
    expect(text).toContain("Alpha");
    expect(text).toContain("Book:");
  });
});
