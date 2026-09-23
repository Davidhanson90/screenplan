import type { AttributeFilter, PlannerPrefs } from "../types.js";

const KEY = "screenplan.prefs.v1";

const DEFAULTS: PlannerPrefs = {
  favorites: [],
  recent: [],
  trailerMinutes: 30,
  maxBreakMinutes: 45,
  bufferMinutes: 10,
  filters: [],
  theme: "system",
  apiBase: null
};

export function loadPrefs(): PlannerPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, filters: [] };
    const parsed = JSON.parse(raw) as Partial<PlannerPrefs>;
    return {
      ...DEFAULTS,
      ...parsed,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      filters: Array.isArray(parsed.filters) ? (parsed.filters as AttributeFilter[]) : [],
      trailerMinutes: num(parsed.trailerMinutes, DEFAULTS.trailerMinutes),
      maxBreakMinutes: num(parsed.maxBreakMinutes, DEFAULTS.maxBreakMinutes),
      bufferMinutes: num(parsed.bufferMinutes, DEFAULTS.bufferMinutes),
      theme: parsed.theme === "dark" || parsed.theme === "light" || parsed.theme === "system"
        ? parsed.theme
        : "system",
      apiBase: typeof parsed.apiBase === "string" ? parsed.apiBase : null
    };
  } catch {
    return { ...DEFAULTS, filters: [] };
  }
}

export function savePrefs(prefs: PlannerPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function toggleFavorite(prefs: PlannerPrefs, code: string): PlannerPrefs {
  const has = prefs.favorites.includes(code);
  return {
    ...prefs,
    favorites: has
      ? prefs.favorites.filter((c) => c !== code)
      : [...prefs.favorites, code]
  };
}

export function pushRecent(prefs: PlannerPrefs, code: string): PlannerPrefs {
  const recent = [code, ...prefs.recent.filter((c) => c !== code)].slice(0, 8);
  return { ...prefs, recent };
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
