import {
  isMovieArray,
  isScheduleResponse,
  isTheaterResponse,
  mapListings,
  mapTheaters
} from "./mapper.js";
import type { Cinema, ListingsPayload, Movie, Schedule, SiteConfig } from "./types.js";

const THEATER_HASH = "2506275789";
const CINEMA_CODE = /^[A-Z0-9]{5}$/;

export const UK_SITE: SiteConfig = {
  baseUrl: "https://www.cineworld.co.uk",
  cinemaCodePrefix: "",
  cinemasPageDataPath: "/page-data/cinemas/page-data.json",
  cinemaPagePathPrefix: "/cinemas/",
  moviePagePathPrefix: "/films/",
  timeZone: "Europe/London"
};

export const IE_SITE: SiteConfig = {
  baseUrl: "https://www.cineworld.ie",
  cinemaCodePrefix: "IE-",
  cinemasPageDataPath: "/page-data/whats-on/x07a4-cineworld-cinema-dublin/page-data.json",
  cinemaPagePathPrefix: "/whats-on/",
  moviePagePathPrefix: "/movies/",
  timeZone: "Europe/Dublin"
};

export const SITES = [UK_SITE, IE_SITE];

const FETCH_OPTS = {
  headers: { Accept: "application/json", "User-Agent": "screenplan/1.0" },
  signal: AbortSignal.timeout(12_000)
};

export async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
  return res.json();
}

export async function loadCinemaList(site: SiteConfig = UK_SITE, getJson = fetchJson): Promise<Cinema[]> {
  try {
    const data = await getJson(`${site.baseUrl}/page-data/sq/d/${THEATER_HASH}.json`);
    if (isTheaterResponse(data)) {
      return mapTheaters(data, site.baseUrl, site.cinemaCodePrefix, site.cinemaPagePathPrefix);
    }
  } catch {
    // fall through to hash discovery
  }

  const pageData = (await getJson(`${site.baseUrl}${site.cinemasPageDataPath}`)) as {
    staticQueryHashes?: string[];
  };
  const hashes = pageData?.staticQueryHashes ?? [];
  for (const hash of hashes) {
    if (hash === THEATER_HASH) continue;
    try {
      const data = await getJson(`${site.baseUrl}/page-data/sq/d/${hash}.json`);
      if (isTheaterResponse(data)) {
        return mapTheaters(data, site.baseUrl, site.cinemaCodePrefix, site.cinemaPagePathPrefix);
      }
    } catch {
      // unrelated query
    }
  }
  throw new Error(`Could not discover theater list for ${site.baseUrl}`);
}

export async function loadAllCinemas(getJson = fetchJson): Promise<Cinema[]> {
  const lists = await Promise.all(SITES.map((site) => loadCinemaList(site, getJson)));
  return lists.flat();
}

export function parseCinemaCode(value: string): { site: SiteConfig; cinemaId: string } | undefined {
  for (const site of SITES) {
    if (!value.startsWith(site.cinemaCodePrefix)) continue;
    const cinemaId = value.slice(site.cinemaCodePrefix.length);
    if (CINEMA_CODE.test(cinemaId)) return { site, cinemaId };
  }
  return undefined;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function scheduleUrl(site: SiteConfig, cinemaId: string, date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const params = new URLSearchParams({
    from: `${date}T03:00:00`,
    theaters: JSON.stringify({ id: cinemaId, timeZone: site.timeZone }),
    to: `${next.toISOString().slice(0, 10)}T03:00:00`
  });
  return `${site.baseUrl}/api/gatsby-source-boxofficeapi/schedule?${params}`;
}

function moviesUrl(site: SiteConfig, movieIds: string[]): string {
  const params = new URLSearchParams({ basic: "false", castingLimit: "3" });
  for (const id of movieIds) params.append("ids", id);
  return `${site.baseUrl}/api/gatsby-source-boxofficeapi/movies?${params}`;
}

export async function loadListings(
  externalCode: string,
  date: string,
  getJson = fetchJson
): Promise<ListingsPayload> {
  const parsed = parseCinemaCode(externalCode);
  if (!parsed || !isValidIsoDate(date)) {
    throw new Error("Invalid cinema code or date");
  }
  const { site, cinemaId } = parsed;
  const scheduleRaw = await getJson(scheduleUrl(site, cinemaId, date));
  if (!isScheduleResponse(scheduleRaw)) {
    throw new Error("Invalid schedule response");
  }
  const schedule: Schedule = scheduleRaw[cinemaId]?.schedule ?? {};
  const movieIds = Object.keys(schedule);
  let movies: Movie[] = [];
  if (movieIds.length > 0) {
    const moviesRaw = await getJson(moviesUrl(site, movieIds));
    if (!isMovieArray(moviesRaw)) throw new Error("Invalid movies response");
    movies = moviesRaw;
  }
  return mapListings(externalCode, schedule, movies, site.baseUrl, site.moviePagePathPrefix);
}
