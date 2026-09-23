import {
  FILM_ATTRIBUTE_VALUES,
  type Cinema,
  type Film,
  type FilmAttribute,
  type ListingsPayload,
  type Movie,
  type Schedule,
  type Screening,
  type Showtime,
  type TheaterResponse
} from "./types.js";

export function mapTheaters(
  response: TheaterResponse,
  siteUrl: string,
  cinemaCodePrefix: string,
  cinemaPagePathPrefix: string
): Cinema[] {
  return response.data.allTheater.nodes.map((theater) => {
    const loc = theater.practicalInfo.location;
    const path = theater.path.replace("/theaters/", cinemaPagePathPrefix);
    return {
      address: {
        address1: loc.address,
        city: loc.city,
        postalCode: loc.zip,
        state: loc.state
      },
      externalCode: `${cinemaCodePrefix}${theater.id}`,
      filename: path.split("/").pop() || "",
      latitude: theater.practicalInfo.coordinates.latitude,
      longitude: theater.practicalInfo.coordinates.longitude,
      name: theater.name,
      uri: `${path}/`,
      websiteUrl: `${siteUrl}${path}/`
    };
  });
}

export function mapListings(
  cinemaId: string,
  schedule: Schedule,
  movies: Movie[],
  siteUrl: string,
  moviePagePathPrefix: string
): ListingsPayload {
  const byId = new Map(movies.map((m) => [m.id, m]));
  const films = movies.map((m) => mapMovie(m, siteUrl, moviePagePathPrefix));
  const events: Screening[] = [];

  for (const movieId of Object.keys(schedule)) {
    const movie = byId.get(movieId);
    const movieAttrs = movie ? movieAttributes(movie) : [];
    const dates = schedule[movieId] ?? {};
    for (const date of Object.keys(dates)) {
      for (const show of dates[date] ?? []) {
        events.push(mapShowtime(show, cinemaId, movieId, date, movieAttrs));
      }
    }
  }

  return { body: { events, films } };
}

function mapMovie(movie: Movie, siteUrl: string, moviePagePathPrefix: string): Film {
  return {
    id: movie.id,
    length: movie.runtime == null ? 0 : movie.runtime / 60,
    link: `${siteUrl}${moviePagePathPrefix}${movie.id}`,
    name: movie.title,
    posterLink: movie.poster || "",
    releaseYear: movie.release == null ? "" : movie.release.slice(0, 4),
    videoLink: movie.trailer?.HD || movie.trailer?.SD || "",
    weight: movie.orderIndex ?? 0
  };
}

function mapShowtime(
  show: Showtime,
  cinemaId: string,
  movieId: string,
  date: string,
  movieAttrs: FilmAttribute[]
): Screening {
  const ticketing =
    show.data.ticketing.find((t) => t.provider === "default") ?? show.data.ticketing[0];
  return {
    attributeIds: unique([...mapTags(show.tags), ...movieAttrs]),
    bookingLink: ticketing?.urls[0] || "",
    businessDay: date,
    cinemaId,
    eventDateTime: show.startsAt,
    filmId: movieId,
    id: show.id,
    soldOut: false
  };
}

function mapTags(tags: string[]): FilmAttribute[] {
  const out: FilmAttribute[] = [];
  for (const tag of tags) {
    const n = tag.toLowerCase();
    if (n.includes("4dx")) out.push("4dx");
    else if (n.includes("screenx")) out.push("screenx");
    else if (n.includes("superscreen")) out.push("superscreen");
    else if (n.includes("audiodescription")) out.push("audio-described");
    else if (n.includes("subtitled")) out.push("subbed");
    else if (n.includes("bigscreenclassics")) out.push("classicfilm");
    else if (n.includes("moviesforjuniors")) out.push("movies-for-juniors");
    else if (n.includes("3d") || n.includes("threed")) out.push("3d");
    else if (n.includes("digital")) out.push("2d");
  }
  return unique(out);
}

function movieAttributes(movie: Movie): FilmAttribute[] {
  const values = [movie.certificate, ...(movie.genres || "").split(",")]
    .map((v) => (v || "").trim().toLowerCase())
    .filter((v): v is FilmAttribute =>
      (FILM_ATTRIBUTE_VALUES as string[]).includes(v)
    );
  return unique(values);
}

function unique<T>(items: T[]): T[] {
  return items.filter((item, i) => items.indexOf(item) === i);
}

export function isTheaterResponse(value: unknown): value is TheaterResponse {
  const nodes = (value as TheaterResponse)?.data?.allTheater?.nodes;
  return Array.isArray(nodes) && nodes.length > 0 && nodes.every((t) =>
    typeof t?.id === "string" &&
    typeof t?.name === "string" &&
    typeof t?.path === "string" &&
    t.path.startsWith("/theaters/") &&
    Number.isFinite(t.practicalInfo?.coordinates?.latitude) &&
    Number.isFinite(t.practicalInfo?.coordinates?.longitude) &&
    typeof t.practicalInfo?.location?.address === "string" &&
    typeof t.practicalInfo?.location?.city === "string" &&
    typeof t.practicalInfo?.location?.zip === "string"
  );
}

export function isScheduleResponse(value: unknown): value is Record<string, { schedule: Schedule } | undefined> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((cinema) => isRecord(cinema) && isSchedule(cinema.schedule));
}

export function isMovieArray(value: unknown): value is Movie[] {
  return Array.isArray(value) && value.every(isMovie);
}

function isSchedule(value: unknown): value is Schedule {
  return isRecord(value) && Object.values(value).every((dayMap) =>
    isRecord(dayMap) && Object.values(dayMap).every((shows) =>
      Array.isArray(shows) && shows.every(isShowtime)
    )
  );
}

function isShowtime(value: unknown): value is Showtime {
  if (!isRecord(value) || !isRecord(value.data) || !Array.isArray(value.data.ticketing)) return false;
  return typeof value.id === "string" && value.id.length > 0
    && typeof value.startsAt === "string" && !Number.isNaN(Date.parse(value.startsAt))
    && Array.isArray(value.tags)
    && value.data.ticketing.every((t) =>
      isRecord(t) && typeof t.provider === "string" && Array.isArray(t.urls)
    );
}

function isMovie(value: unknown): value is Movie {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
