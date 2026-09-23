/** Thin client for the Roaders cineworld-planner upstream API. */

export const DEFAULT_UPSTREAM =
  "https://api.kingshill.cineworld-planner.co.uk:43000";

export function upstreamBase(): string {
  return (process.env.UPSTREAM_API || DEFAULT_UPSTREAM).replace(/\/$/, "");
}

export type UpstreamResult =
  | { ok: true; data: unknown; status: number }
  | { ok: false; status?: number; error: string };

export async function fetchUpstream(path: string): Promise<UpstreamResult> {
  const url = `${upstreamBase()}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "screenplan-api-proxy/1.0"
      },
      signal: AbortSignal.timeout(20_000)
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: `Upstream ${res.status}` };
    }
    const data: unknown = await res.json();
    return { ok: true, data, status: res.status };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Upstream fetch failed"
    };
  }
}
