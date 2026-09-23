import type { Cinema, ListingsPayload, SnapshotMeta } from "../types.js";

export type DataMode = "live" | "snapshot";

export interface DataClientStatus {
  mode: DataMode;
  apiBase: string | null;
  meta: SnapshotMeta | null;
  error?: string;
}

function basePath(): string {
  // Vite base is /screenplan/
  const base = import.meta.env.BASE_URL || "/";
  return base.endsWith("/") ? base : `${base}/`;
}

function snapshotUrl(path: string): string {
  return `${basePath()}data/${path}`.replace(/\/{2,}/g, "/").replace(":/", "://");
}

export class DataClient {
  apiBase: string | null;
  status: DataClientStatus = { mode: "snapshot", apiBase: null, meta: null };

  constructor(apiBase: string | null = null) {
    this.apiBase = apiBase;
    this.status.apiBase = apiBase;
  }

  setApiBase(apiBase: string | null): void {
    this.apiBase = apiBase?.replace(/\/$/, "") || null;
    this.status.apiBase = this.apiBase;
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
          return (await res.json()) as Cinema[];
        }
      } catch (err) {
        this.status.error = err instanceof Error ? err.message : "Live API failed";
      }
    }

    const res = await fetch(snapshotUrl("cinemas.json"), { cache: "no-cache" });
    if (!res.ok) throw new Error(`Could not load cinemas (${res.status})`);
    this.status.mode = "snapshot";
    return (await res.json()) as Cinema[];
  }

  async getListings(cinemaCode: string, date: string): Promise<ListingsPayload> {
    if (this.apiBase) {
      try {
        const res = await fetch(`${this.apiBase}/cinema/${encodeURIComponent(cinemaCode)}/listings/${date}`);
        if (res.ok) {
          this.status.mode = "live";
          return (await res.json()) as ListingsPayload;
        }
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
      return { body: { events: [], films: [] } };
    }
    if (!res.ok) throw new Error(`Could not load listings (${res.status})`);
    this.status.mode = "snapshot";
    return (await res.json()) as ListingsPayload;
  }
}
