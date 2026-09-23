export type FilmAttribute =
  | "2d" | "3d" | "4dx" | "screenx" | "superscreen" | "subbed" | "audio-described"
  | "alternative-content" | "movies-for-juniors" | "classicfilm" | "u" | "pg" | "12a"
  | "15" | "18" | "tbc" | "qa" | "ch" | "action" | "suspense" | "animation"
  | "adventure" | "comedy" | "drama" | "horror" | "reserved-selected";

export const FILM_ATTRIBUTE_VALUES: FilmAttribute[] = [
  "2d", "pg", "screenx", "u", "15", "4dx", "12a", "superscreen", "3d",
  "alternative-content", "audio-described", "subbed", "qa", "ch", "tbc",
  "movies-for-juniors", "18", "action", "suspense", "animation", "adventure",
  "comedy", "drama", "classicfilm", "reserved-selected", "horror"
];

export interface Cinema {
  address: {
    address1: string;
    city: string;
    postalCode: string;
    state?: string;
  };
  externalCode: string;
  filename: string;
  latitude: number;
  longitude: number;
  name: string;
  uri: string;
  websiteUrl: string;
}

export interface Film {
  id: string;
  length: number;
  link: string;
  name: string;
  posterLink: string;
  releaseYear: string;
  videoLink: string;
  weight: number;
}

export interface Screening {
  attributeIds: FilmAttribute[];
  bookingLink: string;
  businessDay: string;
  cinemaId: string;
  eventDateTime: string;
  filmId: string;
  id: string;
  soldOut: boolean;
}

export interface ListingsPayload {
  body: { events: Screening[]; films: Film[] };
}

export interface SiteConfig {
  baseUrl: string;
  cinemaCodePrefix: string;
  cinemasPageDataPath: string;
  cinemaPagePathPrefix: string;
  moviePagePathPrefix: string;
  timeZone: string;
}

export interface TheaterNode {
  id: string;
  name: string;
  path: string;
  practicalInfo: {
    coordinates: { latitude: number; longitude: number };
    location: { address: string; city: string; state?: string; zip: string };
  };
}

export interface TheaterResponse {
  data: { allTheater: { nodes: TheaterNode[] } };
}

export interface Showtime {
  id: string;
  startsAt: string;
  tags: string[];
  data: {
    ticketing: Array<{ provider: string; type: string; urls: string[] }>;
  };
}

export type Schedule = Record<string, Record<string, Showtime[]>>;

export interface Movie {
  id: string;
  title: string;
  runtime?: number | null;
  poster?: string | null;
  release?: string | null;
  certificate?: string | null;
  genres?: string | null;
  orderIndex?: number | null;
  trailer?: { HD?: string | null; SD?: string | null } | null;
}
