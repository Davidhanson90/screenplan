/** Shared domain types for screenplan (frontend + snapshot JSON). */

export type FilmAttribute =
  | "2d"
  | "3d"
  | "4dx"
  | "screenx"
  | "superscreen"
  | "subbed"
  | "audio-described"
  | "alternative-content"
  | "movies-for-juniors"
  | "classicfilm"
  | "u"
  | "pg"
  | "12a"
  | "15"
  | "18"
  | "tbc"
  | "qa"
  | "ch"
  | "action"
  | "suspense"
  | "animation"
  | "adventure"
  | "comedy"
  | "drama"
  | "horror"
  | "reserved-selected";

export interface CinemaAddress {
  address1: string;
  address2?: string;
  address3?: string;
  address4?: string;
  city: string;
  postalCode: string;
  state?: string;
}

export interface Cinema {
  address: CinemaAddress;
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
  body: {
    events: Screening[];
    films: Film[];
  };
}

export interface SnapshotMeta {
  refreshedAt: string;
  source: string;
  days: number;
  cinemaCount: number;
  listingFiles: number;
}

export type FilterMode = "include" | "exclude" | "off";

export interface AttributeFilter {
  attribute: FilmAttribute;
  mode: FilterMode;
}

export type ItinerarySort =
  | "fewest-wait"
  | "earliest-finish"
  | "shortest-span";

export interface PlannerPrefs {
  favorites: string[];
  recent: string[];
  trailerMinutes: number;
  maxBreakMinutes: number;
  bufferMinutes: number;
  filters: AttributeFilter[];
  theme: "dark" | "light" | "system";
  apiBase: string | null;
}

export interface PlanSegment {
  kind: "screening" | "break" | "overlap";
  start: Date;
  end: Date;
  screening?: Screening;
  filmName?: string;
  minutes?: number;
  tight?: boolean;
}

export interface GeneratedPlan {
  screenings: Screening[];
  segments: PlanSegment[];
  totalWaitMinutes: number;
  spanMinutes: number;
  finishAt: Date;
  startAt: Date;
  hasOverlap: boolean;
  hasTightConnection: boolean;
}
