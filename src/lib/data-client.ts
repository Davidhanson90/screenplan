import type { Cinema, ListingsPayload, SnapshotMeta } from "../types.js";

export type DataMode = "live" | "snapshot";

export type LiveVia = "proxy" | "direct" | "env";

export interface DataClientStatus {
  mode: DataMode;
  apiBase: string | null;
  meta: SnapshotMeta | null;
  via?: LiveVia;
  error?: string;
}

/** Roaders cineworld-planner live API (CORS-restricted for browsers on Pages). */
export const UPSTREAM_DIRECT = "https://api.kingshill.cineworld-planner.co.uk:43000";

/** Local Express proxy (npm run api:dev). */
export const LOCAL_API = "http://localhost:3000";

/**
 * Set this after deploying `worker/` (Cloudflare Workers URL).
 * Empty until a worker is deployed; then Pages can use live data without ?api=.
 */
export const KNOWN_WORKER_URL = "";

function basePath(): string {
  // Vite base is /screenplan/
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}

function snapshotUrl(path: string): string {
  return `${basePath()}data/${path}`.replace(/\/{2,}/g, "/").replace(":/", "://");
}

function cleanBase(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Resolve which API base to try for live listings.
 * Priority: explicit (?api= / saved) → VITE_API_BASE → known worker → localhost:3000 on local → kingshill direct.
 */
export function resolveApiBase(explicit: string | null | undefined): string | null {
  if (explicit && explicit.trim()) return cleanBase(explicit.trim());

  const viteBase = import.meta.env.VITE_API_BASE as string | undefined;
  if (viteBase && viteBase.trim()) return cleanBase(viteBase.trim());

  if (KNOWN_WORKER_URL) return cleanBase(KNOWN_WORKER_URL);

  if (typeof location !== "undefined" && isLocalHost(location.hostname)) {
    return LOCAL_API;
  }

  // Pages / production: try upstream direct (may CORS-fail → snapshot fallback).
  return UPSTREAM_DIRECT;
}

function classifyVia(apiBase: string | null): LiveVia | undefined {
  if (!apiBase) return undefined;
  if (apiBase.includes("localhost") || apiBase.includes("127.0.0.1") || apiBase.includes("workers.dev")) {
    return "proxy";
  }
  if (apiBase.includes("kingshill") || apiBase.includes("cineworld-planner")) {
    return "direct";
  }
  return "env";
}

export class DataClient {
  apiBase: string | null;
  status: DataClientStatus = { mode: "snapshot", apiBase: null, meta: null };

  constructor(apiBase: string | null = null) {
    this.apiBase = apiBase;
    this.status.apiBase = apiBase;
    this.status.via = classifyVia(apiBase);
  }

  setApiBase(apiBase: string | null): void {
    this.apiBase = apiBase?.replace(/\/$/, "") || null;
    this.status.apiBase = this.apiBase;
    this.status.via = classifyVia(this.apiBase);
  }

  async loadMeta(): Promise<SnapshotMeta | null> {
    try {
      const res = await fetch(snapshotUrl("meta.json"), { cache: "no-cache" });
      if (!res.ok) return null;
      const meta = (await res.json()) as SnapshotMeta;
      this.status.meta = meta;
      return meta;
    } catch {
      return null;
    }
  }

  async getCinemas(): Promise<Cinema[]> {
    if (this.apiBase) {
      try {
        const res = await fetch(`${this.apiBase}/cinema`);
        if (res.ok) {
          this.status.mode = "live";
          this.status.error = undefined;
          this.status.via = classifyVia(this.apiBase);
          return (await res.json()) as Cinema[];
        }
        this.status.error = `Live API ${res.status}`;
      } catch (err) {
        this.status.error = err instanceof Error ? err.message : "Live API failed";
      }
    }

    const res = await fetch(snapshotUrl("cinemas.json"), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Could not load cinemas (${res.status})`);
    this.status.mode = "snapshot";
    this.status.via = undefined;
    return (await res.json()) as Cinema[];
  }

  async getListings(cinemaCode: string, date: string): Promise<ListingsPayload> {
    if (this.apiBase) {
      try {
        const res = await fetch(
          `${this.apiBase}/cinema/${encodeURIComponent(cinemaCode)}/listings/${date}`
        );
        if (res.ok) {
          this.status.mode = "live";
          this.status.error = undefined;
          this.status.via = classifyVia(this.apiBase);
          return (await res.json()) as ListingsPayload;
        }
        this.status.error = `Live listings ${res.status}`;
      } catch (err) {
        this.status.error = err instanceof Error ? err.message : "Live listings failed";
      }
    }

    const res = await fetch(
      snapshotUrl(`listings/${encodeURIComponent(cinemaCode)}/${date}.json`),
      { cache: "no-cache" }
    );
    if (res.status === 404) {
      this.status.mode = "snapshot";
      this.status.via = undefined;
      return { body: { events: [], films: [] } };
    }
    if (!res.ok) throw new Error(`Could not load listings (${res.status})`);
    this.status.mode = "snapshot";
    this.status.via = undefined;
    return (await res.json()) as ListingsPayload;
  }
}
