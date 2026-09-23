/**
 * Generate rich fake demo listings for GitHub Pages.
 * Rolling Europe/London dates so the planner always has dense multi-film schedules.
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Cinema, Film, FilmAttribute, ListingsPayload, Screening } from "../src/types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "data");
const DAYS = 7;

const DEMO_CINEMAS: Cinema[] = [
  {
    address: {
      address1: "5-6 Leicester Square",
      city: "London",
      postalCode: "WC2H 7NA",
      state: "England"
    },
    externalCode: "X06V1",
    filename: "x06v1-cineworld-cinema-london-leicester-square",
    latitude: 51.5108,
    longitude: -0.1304,
    name: "London - Leicester Square",
    uri: "/cinemas/x06v1-cineworld-cinema-london-leicester-square/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x06v1-cineworld-cinema-london-leicester-square/"
  },
  {
    address: {
      address1: "The O2",
      city: "London",
      postalCode: "SE10 0DX",
      state: "England"
    },
    externalCode: "X087G",
    filename: "x087g-cineworld-cinema-london-the-o2-greenwich",
    latitude: 51.5018,
    longitude: 0.0046,
    name: "London - The O2 Greenwich",
    uri: "/cinemas/x087g-cineworld-cinema-london-the-o2-greenwich/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x087g-cineworld-cinema-london-the-o2-greenwich/"
  },
  {
    address: {
      address1: "Hertsmere Road",
      city: "London",
      postalCode: "E14 4AL",
      state: "England"
    },
    externalCode: "X0795",
    filename: "x0795-cineworld-cinema-london-west-india-quay",
    latitude: 51.5079,
    longitude: -0.0224,
    name: "London - West India Quay",
    uri: "/cinemas/x0795-cineworld-cinema-london-west-india-quay/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x0795-cineworld-cinema-london-west-india-quay/"
  },
  {
    address: {
      address1: "Southside Shopping Centre",
      city: "London",
      postalCode: "SW18 4TF",
      state: "England"
    },
    externalCode: "X076W",
    filename: "x076w-cineworld-cinema-london-wandsworth",
    latitude: 51.4547,
    longitude: -0.1928,
    name: "London - Wandsworth",
    uri: "/cinemas/x076w-cineworld-cinema-london-wandsworth/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x076w-cineworld-cinema-london-wandsworth/"
  },
  {
    address: {
      address1: "Brighton Marina Village",
      city: "Brighton",
      postalCode: "BN2 5UF",
      state: "England"
    },
    externalCode: "X079B",
    filename: "x079b-cineworld-cinema-brighton",
    latitude: 50.8126,
    longitude: -0.1058,
    name: "Brighton",
    uri: "/cinemas/x079b-cineworld-cinema-brighton/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x079b-cineworld-cinema-brighton/"
  },
  {
    address: {
      address1: "Fountain Park",
      city: "Edinburgh",
      postalCode: "EH11 1AF",
      state: "Scotland"
    },
    externalCode: "X07A1",
    filename: "x07a1-cineworld-cinema-edinburgh",
    latitude: 55.9413,
    longitude: -3.2175,
    name: "Edinburgh",
    uri: "/cinemas/x07a1-cineworld-cinema-edinburgh/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x07a1-cineworld-cinema-edinburgh/"
  },
  {
    address: {
      address1: "181 Broad Street",
      city: "Birmingham",
      postalCode: "B15 1DA",
      state: "England"
    },
    externalCode: "X079J",
    filename: "x079j-cineworld-cinema-birmingham-broad-street",
    latitude: 52.4743,
    longitude: -1.9157,
    name: "Birmingham Broad Street",
    uri: "/cinemas/x079j-cineworld-cinema-birmingham-broad-street/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x079j-cineworld-cinema-birmingham-broad-street/"
  },
  {
    address: {
      address1: "Silverburn Shopping Centre",
      city: "Glasgow",
      postalCode: "G53 6AG",
      state: "Scotland"
    },
    externalCode: "X0VQ1",
    filename: "x0vq1-cineworld-cinema-glasgow-silverburn",
    latitude: 55.8231,
    longitude: -4.3433,
    name: "Glasgow Silverburn",
    uri: "/cinemas/x0vq1-cineworld-cinema-glasgow-silverburn/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x0vq1-cineworld-cinema-glasgow-silverburn/"
  },
  {
    address: {
      address1: "Parrs Wood Entertainment Centre",
      city: "Manchester",
      postalCode: "M20 5PG",
      state: "England"
    },
    externalCode: "X079R",
    filename: "x079r-cineworld-cinema-didsbury",
    latitude: 53.4097,
    longitude: -2.2193,
    name: "Manchester - Didsbury",
    uri: "/cinemas/x079r-cineworld-cinema-didsbury/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x079r-cineworld-cinema-didsbury/"
  },
  {
    address: {
      address1: "The Gate",
      city: "Newcastle Upon Tyne",
      postalCode: "NE1 5TG",
      state: "England"
    },
    externalCode: "X06TH",
    filename: "x06th-cineworld-cinema-newcastle-upon-tyne",
    latitude: 54.9726,
    longitude: -1.6199,
    name: "Newcastle upon Tyne",
    uri: "/cinemas/x06th-cineworld-cinema-newcastle-upon-tyne/",
    websiteUrl: "https://www.cineworld.co.uk/cinemas/x06th-cineworld-cinema-newcastle-upon-tyne/"
  }
];

interface DemoFilm extends Film {
  attributeSets: FilmAttribute[][];
  /** Local wall-clock start times HH:MM staggered for multi-film plans. */
  startTimes: string[];
}

const DEMO_FILMS: DemoFilm[] = [
  {
    id: "demo-neon-harbour",
    length: 95,
    link: "https://example.com/films/neon-harbour",
    name: "Neon Harbour",
    posterLink: "",
    releaseYear: "2026",
    videoLink: "",
    weight: 10,
    attributeSets: [
      ["2d", "12a", "action", "adventure"],
      ["2d", "audio-described", "12a", "action"],
      ["superscreen", "2d", "12a", "action"]
    ],
    startTimes: ["13:00", "15:40", "18:10", "20:40"]
  },
  {
    id: "demo-quiet-orbit",
    length: 118,
    link: "https://example.com/films/quiet-orbit",
    name: "The Quiet Orbit",
    posterLink: "",
    releaseYear: "2026",
    videoLink: "",
    weight: 9,
    attributeSets: [
      ["2d", "15", "drama"],
      ["2d", "subbed", "15", "drama"],
      ["2d", "audio-described", "15", "drama"]
    ],
    // Ends ~15:00+trailers from 13:00 95min → next ~15:25; this starts 15:30
    startTimes: ["12:40", "15:30", "18:30", "21:10"]
  },
  {
    id: "demo-paws-destiny",
    length: 90,
    link: "https://example.com/films/paws-of-destiny",
    name: "Paws of Destiny",
    posterLink: "",
    releaseYear: "2026",
    videoLink: "",
    weight: 8,
    attributeSets: [
      ["2d", "u", "animation", "adventure", "movies-for-juniors"],
      ["3d", "u", "animation", "adventure"],
      ["2d", "audio-described", "u", "animation"]
    ],
    startTimes: ["12:20", "14:20", "16:20", "18:20"]
  },
  {
    id: "demo-midnight-protocol",
    length: 132,
    link: "https://example.com/films/midnight-protocol",
    name: "Midnight Protocol",
    posterLink: "",
    releaseYear: "2025",
    videoLink: "",
    weight: 11,
    attributeSets: [
      ["2d", "15", "suspense", "action"],
      ["4dx", "2d", "15", "suspense"],
      ["2d", "audio-described", "15", "suspense"]
    ],
    startTimes: ["13:20", "16:40", "19:50"]
  },
  {
    id: "demo-garden-echoes",
    length: 105,
    link: "https://example.com/films/garden-of-echoes",
    name: "Garden of Echoes",
    posterLink: "",
    releaseYear: "2026",
    videoLink: "",
    weight: 7,
    attributeSets: [
      ["2d", "12a", "comedy", "drama"],
      ["2d", "subbed", "12a", "comedy"],
      ["2d", "audio-described", "12a", "comedy"]
    ],
    startTimes: ["14:00", "16:50", "19:20", "21:30"]
  },
  {
    id: "demo-stormglass",
    length: 145,
    link: "https://example.com/films/stormglass",
    name: "Stormglass",
    posterLink: "",
    releaseYear: "2026",
    videoLink: "",
    weight: 12,
    attributeSets: [
      ["3d", "12a", "adventure", "action"],
      ["superscreen", "2d", "12a", "adventure"],
      ["2d", "audio-described", "12a", "adventure"]
    ],
    startTimes: ["12:50", "16:10", "19:40"]
  },
  {
    id: "demo-last-light",
    length: 110,
    link: "https://example.com/films/last-light-express",
    name: "Last Light Express",
    posterLink: "",
    releaseYear: "2025",
    videoLink: "",
    weight: 6,
    attributeSets: [
      ["2d", "15", "horror"],
      ["2d", "subbed", "15", "horror"],
      ["screenx", "2d", "15", "horror"]
    ],
    startTimes: ["14:50", "17:40", "20:20"]
  }
];

function todayIsoLondon(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function nextDays(count: number): string[] {
  const start = todayIsoLondon();
  // Noon UTC avoids DST edge cases when stepping calendar days from a London date.
  const base = new Date(`${start}T12:00:00Z`);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base.getTime());
    d.setUTCDate(base.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function cinemaOffsetMinutes(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i += 1) h = (h + code.charCodeAt(i) * (i + 3)) % 17;
  return h; // 0–16 minutes so sites aren't identical
}

function addMinutesToHm(hm: string, minutes: number): string {
  const [hh, mm] = hm.split(":").map(Number);
  const total = (hh! * 60 + mm! + minutes + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toFilms(): Film[] {
  return DEMO_FILMS.map(({ attributeSets: _a, startTimes: _s, ...film }) => film);
}

function buildListings(cinema: Cinema, date: string): ListingsPayload {
  const offset = cinemaOffsetMinutes(cinema.externalCode);
  const events: Screening[] = [];
  const films = toFilms();

  for (const film of DEMO_FILMS) {
    film.startTimes.forEach((hm, idx) => {
      const shifted = addMinutesToHm(hm, offset);
      const attrs = film.attributeSets[idx % film.attributeSets.length]!;
      const eventDateTime = `${date}T${shifted}:00`;
      events.push({
        attributeIds: attrs,
        bookingLink: "https://example.com/book",
        businessDay: date,
        cinemaId: cinema.externalCode,
        eventDateTime,
        filmId: film.id,
        id: `${film.id}-${date}-${shifted}-${attrs.join(",")}`,
        soldOut: false
      });
    });
  }

  events.sort((a, b) => a.eventDateTime.localeCompare(b.eventDateTime));
  return { body: { events, films } };
}

async function main(): Promise<void> {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "listings"), { recursive: true });

  await writeFile(join(OUT, "cinemas.json"), JSON.stringify(DEMO_CINEMAS, null, 2));

  const dates = nextDays(DAYS);
  let listingFiles = 0;

  for (const cinema of DEMO_CINEMAS) {
    const dir = join(OUT, "listings", cinema.externalCode);
    await mkdir(dir, { recursive: true });
    for (const date of dates) {
      const payload = buildListings(cinema, date);
      await writeFile(join(dir, `${date}.json`), JSON.stringify(payload));
      listingFiles += 1;
    }
  }

  const sample = buildListings(DEMO_CINEMAS[0]!, dates[0]!);
  const meta = {
    refreshedAt: new Date().toISOString(),
    source: "fake-demo",
    days: DAYS,
    cinemaCount: DEMO_CINEMAS.length,
    listingCinemaCount: DEMO_CINEMAS.length,
    listingFiles,
    demo: true,
    filmCount: DEMO_FILMS.length,
    eventsPerDay: sample.body.events.length
  };
  await writeFile(join(OUT, "meta.json"), JSON.stringify(meta, null, 2));

  console.log(
    `Wrote fake demo: ${DEMO_CINEMAS.length} cinemas × ${DAYS} days = ${listingFiles} files; ` +
      `${DEMO_FILMS.length} films, ~${sample.body.events.length} events/day.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
