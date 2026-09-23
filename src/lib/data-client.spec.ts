import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCAL_API, resolveApiBase, UPSTREAM_DIRECT } from "./data-client.js";

describe("resolveApiBase", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers explicit base", () => {
    expect(resolveApiBase("https://example.com/api/")).toBe("https://example.com/api");
  });

  it("defaults to local API on localhost", () => {
    vi.stubGlobal("location", { hostname: "localhost" });
    expect(resolveApiBase(null)).toBe(LOCAL_API);
  });

  it("defaults to local API on 127.0.0.1", () => {
    vi.stubGlobal("location", { hostname: "127.0.0.1" });
    expect(resolveApiBase(null)).toBe(LOCAL_API);
  });

  it("returns null on GitHub Pages (no live / CORS attempt)", () => {
    vi.stubGlobal("location", { hostname: "davidhanson90.github.io" });
    expect(resolveApiBase(null)).toBeNull();
  });

  it("returns null when location is unavailable (Node / SSR)", () => {
    // vitest node env: no location global → bundled demo only
    expect(resolveApiBase(null)).toBeNull();
  });

  it("still allows explicit live base on Pages", () => {
    vi.stubGlobal("location", { hostname: "davidhanson90.github.io" });
    expect(resolveApiBase(UPSTREAM_DIRECT)).toBe(UPSTREAM_DIRECT);
  });
});
