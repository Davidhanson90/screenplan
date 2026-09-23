/**
 * Refresh bundled snapshot data for GitHub Pages offline demo.
 * Uses the public original API server-side (no browser CORS), with optional
 * direct Cineworld mapping via SCREENPLAN_DIRECT=1.
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "data");
const DAYS = Number(process.env.SCREENPLAN_DAYS || 5);
const MAX_CINEMAS = Number(process.env.SCREENPLAN_MAX_CINEMAS || 35);
const FALLBACK_API =
  process.env.SCREENPLAN_FALLBACK_API ||
  "https://api.kingshill.cineworld-planner.co.uk:43000";
const USE_DIRECT = process.env.SCREENPLAN_DIRECT === "1";
const CONCURRENCY = Number(process.env.SCREENPLAN_CONCURRENCY || 4);

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function nextDays(count: number): string[] {
  const start = todayIso();
  const base = new Date(`${start}T12:00:00Z`);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base.getTime());
    d.setUTCDate(base.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "screenplan-refresh/1.0" },
    signal: AbortSignal.timeout(30_000)
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      results[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function pickCinemas(cinemas: Array<{ externalCode: string; name: string }>) {
  const boost = [
    "Leicester",
    "O2",
    "West India",
    "Glasgow",
    "Edinburgh",
    "Birmingham",
    "Manchester",
    "Cardiff",
    "Dublin",
    "Brighton",
    "Milton Keynes",
    "Sheffield",
    "Leeds",
    "Liverpool",
    "Bristol",
    "Newcastle",
    "Nottingham",
    "Southampton",
    "Croydon",
    "Wandsworth"
  ];
  const boosted = cinemas.filter((c) => boost.some((b) => c.name.includes(b)));
  const alpha = [...cinemas].sort((a, b) => a.name.localeCompare(b.name));
  return [...boosted, ...alpha]
    .filter((c, i, arr) => arr.findIndex((x) => x.externalCode === c.externalCode) === i)
    .slice(0, MAX_CINEMAS);
}

async function main(): Promise<void> {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "listings"), { recursive: true });

  let source = "fallback-api";
  let cinemas: Array<{ externalCode: string; name: string }> = [];
  let loadListings: (code: string, date: string) => Promise<unknown>;

  if (USE_DIRECT) {
    source = "cineworld-direct";
    const client = await import("../api/src/cineworld-client.js");
    cinemas = await client.loadAllCinemas();
    loadListings = (code, date) => client.loadListings(code, date);
  } else {
    cinemas = (await fetchJson(`${FALLBACK_API}/cinema`)) as Array<{
      externalCode: string;
      name: string;
    }>;
    loadListings = (code, date) =>
      fetchJson(`${FALLBACK_API}/cinema/${encodeURIComponent(code)}/listings/${date}`);
  }

  await writeFile(join(OUT, "cinemas.json"), JSON.stringify(cinemas));
  const subset = pickCinemas(cinemas);
  const dates = nextDays(DAYS);
  const jobs = subset.flatMap((cinema) => dates.map((date) => ({ cinema, date })));

  let listingFiles = 0;
  await mapPool(jobs, CONCURRENCY, async ({ cinema, date }) => {
    try {
      const listings = (await loadListings(cinema.externalCode, date)) as {
        body?: { events?: unknown[]; films?: unknown[] };
      };
      const events = listings?.body?.events?.length ?? 0;
      const films = listings?.body?.films?.length ?? 0;
      if (!events && !films) return;
      const path = join(OUT, "listings", cinema.externalCode, `${date}.json`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(listings));
      listingFiles += 1;
      process.stdout.write(".");
    } catch (err) {
      console.warn(
        `\nskip ${cinema.externalCode} ${date}:`,
        err instanceof Error ? err.message : err
      );
    }
  });

  const meta = {
    refreshedAt: new Date().toISOString(),
    source,
    days: DAYS,
    cinemaCount: cinemas.length,
    listingCinemaCount: subset.length,
    listingFiles
  };
  await writeFile(join(OUT, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(
    `\nWrote ${listingFiles} listing files for ${subset.length} cinemas (${cinemas.length} total) via ${source}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
