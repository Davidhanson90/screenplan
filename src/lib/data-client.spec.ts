import { describe, expect, it } from "vitest";
import { LOCAL_API, resolveApiBase, UPSTREAM_DIRECT } from "./data-client.js";

describe("resolveApiBase", () => {
  it("prefers explicit base", () => {
    expect(resolveApiBase("https://example.com/api/")).toBe("https://example.com/api");
  });

  it("falls back to local or upstream when no explicit base", () => {
    const resolved = resolveApiBase(null);
    expect([LOCAL_API, UPSTREAM_DIRECT]).toContain(resolved);
  });
});
