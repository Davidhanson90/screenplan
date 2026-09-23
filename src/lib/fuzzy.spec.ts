import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy.js";

describe("fuzzy", () => {
  it("scores substring higher", () => {
    expect(fuzzyScore("west", "Cineworld West India Quay")).toBeGreaterThan(
      fuzzyScore("wq", "Cineworld West India Quay")
    );
  });

  it("filters items", () => {
    const items = [{ name: "Leicester Square" }, { name: "O2 Greenwich" }, { name: "Glasgow" }];
    const out = fuzzyFilter(items, "green", (i) => i.name);
    expect(out.map((i) => i.name)).toEqual(["O2 Greenwich"]);
  });
});
