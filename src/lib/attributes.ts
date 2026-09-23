import type { FilmAttribute } from "../types.js";

export const FORMAT_ATTRIBUTES: FilmAttribute[] = [
  "2d",
  "3d",
  "4dx",
  "screenx",
  "superscreen"
];

export const ACCESS_ATTRIBUTES: FilmAttribute[] = [
  "subbed",
  "audio-described",
  "movies-for-juniors",
  "classicfilm",
  "alternative-content"
];

export interface AttributeMeta {
  id: FilmAttribute;
  label: string;
  short: string;
}

const META: Record<string, AttributeMeta> = {
  "2d": { id: "2d", label: "2D", short: "2D" },
  "3d": { id: "3d", label: "3D", short: "3D" },
  "4dx": { id: "4dx", label: "4DX", short: "4DX" },
  screenx: { id: "screenx", label: "ScreenX", short: "SX" },
  superscreen: { id: "superscreen", label: "Superscreen", short: "SS" },
  subbed: { id: "subbed", label: "Subtitled", short: "SU" },
  "audio-described": { id: "audio-described", label: "Audio described", short: "AD" },
  "alternative-content": { id: "alternative-content", label: "Alt content", short: "AC" },
  "movies-for-juniors": { id: "movies-for-juniors", label: "Juniors", short: "J" },
  classicfilm: { id: "classicfilm", label: "Classic", short: "Cl" }
};

export function attributeMeta(id: FilmAttribute): AttributeMeta | undefined {
  return META[id];
}

export function chipAttributes(ids: FilmAttribute[]): AttributeMeta[] {
  return ids.map(attributeMeta).filter((m): m is AttributeMeta => m != null);
}
