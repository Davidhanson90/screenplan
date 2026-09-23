import type { AttributeFilter, FilmAttribute, Screening } from "../types.js";

/** Returns true when a screening passes include/exclude attribute filters. */
export function matchesFilters(filters: AttributeFilter[], screening: Screening): boolean {
  const active = filters.filter((f) => f.mode !== "off");
  if (active.length === 0) return true;

  for (const filter of active) {
    const has = screening.attributeIds.includes(filter.attribute);
    if (filter.mode === "exclude" && has) return false;
  }

  const includes = active.filter((f) => f.mode === "include");
  return includes.every((f) => screening.attributeIds.includes(f.attribute));
}

export function cycleFilterMode(mode: AttributeFilter["mode"]): AttributeFilter["mode"] {
  if (mode === "off") return "include";
  if (mode === "include") return "exclude";
  return "off";
}

export function upsertFilter(
  filters: AttributeFilter[],
  attribute: FilmAttribute,
  mode: AttributeFilter["mode"]
): AttributeFilter[] {
  const rest = filters.filter((f) => f.attribute !== attribute);
  if (mode === "off") return rest;
  return [...rest, { attribute, mode }];
}
