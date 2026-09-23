export interface UrlPlanState {
  cinema?: string;
  date?: string;
  films?: string[];
  api?: string;
}

export function readUrlState(search = window.location.search, hash = window.location.hash): UrlPlanState {
  const fromHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(fromHash.includes("=") ? fromHash : search);
  // Prefer query string; fall back to hash query style
  if (![...params.keys()].length && search) {
    const q = new URLSearchParams(search);
    return parseParams(q);
  }
  if (![...params.keys()].length) {
    return parseParams(new URLSearchParams(search));
  }
  return parseParams(params);
}

function parseParams(params: URLSearchParams): UrlPlanState {
  const cinema = params.get("cinema") || undefined;
  const date = params.get("date") || undefined;
  const filmsRaw = params.get("films") || "";
  const films = filmsRaw
    ? filmsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;
  const api = params.get("api") || undefined;
  return { cinema, date, films, api };
}

export function writeUrlState(state: UrlPlanState, replace = true): void {
  const params = new URLSearchParams();
  if (state.cinema) params.set("cinema", state.cinema);
  if (state.date) params.set("date", state.date);
  if (state.films?.length) params.set("films", state.films.join(","));
  if (state.api) params.set("api", state.api);
  const qs = params.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash.split("?")[0] || ""}`;
  if (replace) {
    history.replaceState(null, "", url);
  } else {
    history.pushState(null, "", url);
  }
}
