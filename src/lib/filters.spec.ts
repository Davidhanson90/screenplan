import { describe, expect, it } from "vitest";
import { cycleFilterMode, matchesFilters, upsertFilter } from "./filters.js";
import type { Screening } from "../types.js";

const screening = (attrs: Screening["attributeIds"]): Screening => ({
  attributeIds: attrs,
  bookingLink: "",
  businessDay: "2026-09-23",
  cinemaId: "X0001",
  eventDateTime: "2026-09-23T18:00:00",
  filmId: "f1",
  id: "e1",
  soldOut: false
});

describe("filters", () => {
  it("cycles modes", () => {
    expect(cycleFilterMode("off")).toBe("include");
    expect(cycleFilterMode("include")).toBe("exclude");
    expect(cycleFilterMode("exclude")).toBe("off");
  });

  it("upserts filters", () => {
    const a = upsertFilter([], "2d", "include");
    expect(a).toEqual([{ attribute: "2d", mode: "include" }]);
    expect(upsertFilter(a, "2d", "off")).toEqual([]);
  });

  it("matches include/exclude", () => {
    const s = screening(["2d", "subbed"]);
    expect(matchesFilters([{ attribute: "2d", mode: "include" }], s)).toBe(true);
    expect(matchesFilters([{ attribute: "3d", mode: "include" }], s)).toBe(false);
    expect(matchesFilters([{ attribute: "subbed", mode: "exclude" }], s)).toBe(false);
    expect(matchesFilters([], s)).toBe(true);
  });
});
