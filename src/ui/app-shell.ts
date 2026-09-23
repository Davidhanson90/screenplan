import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ACCESS_ATTRIBUTES, FORMAT_ATTRIBUTES, chipAttributes } from "../lib/attributes.js";
import { DataClient, resolveApiBase } from "../lib/data-client.js";
import { distanceKm, formatDistance } from "../lib/distance.js";
import { cycleFilterMode, matchesFilters, upsertFilter } from "../lib/filters.js";
import { fuzzyFilter } from "../lib/fuzzy.js";
import {
  generateItineraries,
  planToPlainText,
  screeningEnd,
  screeningStart,
  summarizePlan
} from "../lib/itinerary.js";
import { loadPrefs, pushRecent, savePrefs, toggleFavorite } from "../lib/preferences.js";
import { formatClock, formatDateLabel, nextDays, todayIso } from "../lib/time.js";
import { readUrlState, writeUrlState } from "../lib/url-state.js";
import type {
  Cinema,
  Film,
  FilmAttribute,
  GeneratedPlan,
  ItinerarySort,
  PlannerPrefs,
  Screening
} from "../types.js";

const FILM_COLORS = [
  "var(--sp-film-0)",
  "var(--sp-film-1)",
  "var(--sp-film-2)",
  "var(--sp-film-3)",
  "var(--sp-film-4)",
  "var(--sp-film-5)"
];

@customElement("sp-app")
export class SpApp extends LitElement {
  @state() private prefs: PlannerPrefs = loadPrefs();
  @state() private cinemas: Cinema[] = [];
  @state() private cinemaQuery = "";
  @state() private selectedCinema: Cinema | null = null;
  @state() private dates: string[] = nextDays(7);
  @state() private selectedDate = todayIso();
  @state() private films: Film[] = [];
  @state() private screenings: Screening[] = [];
  @state() private selectedFilmIds: string[] = [];
  @state() private lockedFilmIds: string[] = [];
  @state() private selectedScreeningIds: string[] = [];
  @state() private loadingCinemas = true;
  @state() private loadingListings = false;
  @state() private error: string | null = null;
  @state() private geo: { lat: number; lon: number } | null = null;
  @state() private sort: ItinerarySort = "fewest-wait";
  @state() private earliest = "";
  @state() private latest = "";
  @state() private showNearMe = false;
  @state() private toast: string | null = null;
  @state() private dataMode: "live" | "snapshot" = "snapshot";
  @state() private refreshedAt: string | null = null;

  private client = new DataClient(null);
  private toastTimer: number | undefined;

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
    }
    .shell {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px 48px;
    }
    header.top {
      position: sticky;
      top: 0;
      z-index: 20;
      backdrop-filter: blur(12px);
      background: color-mix(in srgb, var(--sp-bg) 82%, transparent);
      border-bottom: 1px solid var(--sp-border);
      margin: 0 -16px;
      padding: 12px 16px;
    }
    .top-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .brand h1 {
      margin: 0;
      font-size: 1.35rem;
      letter-spacing: -0.03em;
    }
    .brand p {
      margin: 0;
      color: var(--sp-muted);
      font-size: 0.85rem;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .banner.live {
      border-color: color-mix(in srgb, var(--accent, #7dd3fc) 45%, transparent);
      background: color-mix(in srgb, var(--accent, #7dd3fc) 12%, transparent);
    }
    .banner {
      margin-top: 10px;
      padding: 8px 12px;
      border-radius: var(--sp-radius-sm);
      background: color-mix(in srgb, var(--sp-warning) 18%, var(--sp-panel));
      border: 1px solid color-mix(in srgb, var(--sp-warning) 40%, var(--sp-border));
      color: var(--sp-text);
      font-size: 0.85rem;
    }
    .panel {
      background: var(--sp-panel);
      border: 1px solid var(--sp-border);
      border-radius: var(--sp-radius);
      box-shadow: var(--sp-shadow);
      padding: 16px;
      margin-top: 16px;
    }
    .panel h2 {
      margin: 0 0 12px;
      font-size: 1.05rem;
    }
    .grid-2 {
      display: grid;
      gap: 16px;
    }
    @media (min-width: 900px) {
      .grid-2 {
        grid-template-columns: 1.1fr 0.9fr;
      }
    }
    label.field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--sp-muted);
    }
    input[type="search"],
    input[type="text"],
    input[type="number"],
    input[type="time"],
    select {
      background: var(--sp-panel-2);
      color: var(--sp-text);
      border: 1px solid var(--sp-border);
      border-radius: var(--sp-radius-sm);
      padding: 10px 12px;
    }
    button,
    .btn {
      appearance: none;
      border: 1px solid var(--sp-border);
      background: var(--sp-btn);
      color: var(--sp-text);
      border-radius: 999px;
      padding: 8px 14px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    button:hover,
    .btn:hover {
      background: var(--sp-btn-hover);
    }
    button.primary {
      background: var(--sp-accent);
      border-color: transparent;
      color: #061018;
      font-weight: 600;
    }
    button.ghost {
      background: transparent;
    }
    button.active {
      border-color: var(--sp-accent);
      box-shadow: inset 0 0 0 1px var(--sp-accent);
    }
    .cinema-list {
      list-style: none;
      margin: 12px 0 0;
      padding: 0;
      max-height: 280px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cinema-item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      border-radius: var(--sp-radius-sm);
      border: 1px solid transparent;
      background: var(--sp-panel-2);
      cursor: pointer;
      text-align: left;
      width: 100%;
    }
    .cinema-item.selected {
      border-color: var(--sp-accent);
    }
    .cinema-item .meta {
      color: var(--sp-muted);
      font-size: 0.8rem;
    }
    .pin {
      border: none;
      background: transparent;
      font-size: 1.1rem;
      padding: 4px;
      cursor: pointer;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      border-radius: 999px;
      border: 1px solid var(--sp-border);
      background: var(--sp-panel-2);
      padding: 6px 10px;
      font-size: 0.8rem;
      cursor: pointer;
    }
    .chip.include {
      background: color-mix(in srgb, var(--sp-success) 22%, var(--sp-panel));
      border-color: var(--sp-success);
    }
    .chip.exclude {
      background: color-mix(in srgb, var(--sp-danger) 22%, var(--sp-panel));
      border-color: var(--sp-danger);
    }
    .dates {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .date-btn {
      white-space: nowrap;
      min-width: 88px;
    }
    .film-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    .film-card {
      border: 1px solid var(--sp-border);
      border-radius: var(--sp-radius-sm);
      background: var(--sp-panel-2);
      overflow: hidden;
      cursor: pointer;
      text-align: left;
      padding: 0;
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .film-card.selected {
      border-color: var(--sp-accent);
      box-shadow: 0 0 0 1px var(--sp-accent);
    }
    .film-card.locked {
      outline: 2px dashed var(--sp-warning);
    }
    .poster {
      aspect-ratio: 2 / 3;
      background: linear-gradient(145deg, #1a2740, #0d1422);
      display: grid;
      place-items: center;
      color: var(--sp-muted);
      font-size: 0.75rem;
      overflow: hidden;
    }
    .poster img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .film-body {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }
    .film-body strong {
      font-size: 0.92rem;
    }
    .muted {
      color: var(--sp-muted);
      font-size: 0.8rem;
    }
    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    .timeline-wrap {
      overflow-x: auto;
      margin-top: 12px;
      border: 1px solid var(--sp-border);
      border-radius: var(--sp-radius-sm);
      background: var(--sp-panel-2);
    }
    .timeline {
      min-width: 720px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .row {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 10px;
      align-items: center;
    }
    .track {
      position: relative;
      height: 28px;
      background: color-mix(in srgb, var(--sp-border) 40%, transparent);
      border-radius: 8px;
      overflow: hidden;
    }
    .bar {
      position: absolute;
      top: 2px;
      bottom: 2px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      color: #061018;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0 6px;
      overflow: hidden;
      white-space: nowrap;
    }
    .bar.picked {
      box-shadow: 0 0 0 2px #fff;
    }
    .itinerary {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .seg {
      padding: 10px 12px;
      border-radius: var(--sp-radius-sm);
      border: 1px solid var(--sp-border);
      background: var(--sp-panel-2);
    }
    .seg.break {
      background: color-mix(in srgb, var(--sp-success) 14%, var(--sp-panel));
    }
    .seg.overlap {
      background: color-mix(in srgb, var(--sp-danger) 18%, var(--sp-panel));
    }
    .seg.tight {
      border-color: var(--sp-warning);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 0.72rem;
      background: var(--sp-btn);
      border: 1px solid var(--sp-border);
    }
    .badge.warn {
      background: color-mix(in srgb, var(--sp-warning) 25%, transparent);
    }
    .badge.danger {
      background: color-mix(in srgb, var(--sp-danger) 25%, transparent);
    }
    .empty,
    .error,
    .skeleton {
      padding: 18px;
      border-radius: var(--sp-radius-sm);
      border: 1px dashed var(--sp-border);
      color: var(--sp-muted);
      text-align: center;
    }
    .error {
      border-color: var(--sp-danger);
      color: var(--sp-danger);
    }
    .skeleton {
      background: linear-gradient(
        90deg,
        var(--sp-panel-2),
        color-mix(in srgb, var(--sp-accent) 12%, var(--sp-panel-2)),
        var(--sp-panel-2)
      );
      background-size: 200% 100%;
      animation: shimmer 1.2s infinite linear;
      min-height: 64px;
    }
    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--sp-panel);
      border: 1px solid var(--sp-border);
      padding: 10px 16px;
      border-radius: 999px;
      box-shadow: var(--sp-shadow);
      z-index: 50;
    }
    footer {
      margin-top: 28px;
      color: var(--sp-muted);
      font-size: 0.82rem;
    }
    .plan-card {
      border: 1px solid var(--sp-border);
      border-radius: var(--sp-radius-sm);
      padding: 12px;
      background: var(--sp-panel-2);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .plan-list {
      display: grid;
      gap: 10px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.applyTheme();
    const url = readUrlState();
    if (url.api) {
      // Explicit ?api= wins and is persisted.
      this.prefs = { ...this.prefs, apiBase: url.api };
      savePrefs(this.prefs);
    }
    if (url.date && this.dates.includes(url.date)) this.selectedDate = url.date;
    if (url.films?.length) this.selectedFilmIds = url.films;
    // Prefer saved/?api= base; else VITE_API_BASE / worker / localhost:3000 / kingshill direct.
    this.client.setApiBase(resolveApiBase(this.prefs.apiBase));
    void this.bootstrap(url.cinema);
  }

  private applyTheme(): void {
    const theme = this.prefs.theme;
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
      const light = window.matchMedia("(prefers-color-scheme: light)").matches;
      root.setAttribute("data-theme", light ? "light" : "dark");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }

  private async bootstrap(preferredCinema?: string): Promise<void> {
    this.loadingCinemas = true;
    this.error = null;
    try {
      const meta = await this.client.loadMeta();
      this.refreshedAt = meta?.refreshedAt ?? null;
      this.cinemas = await this.client.getCinemas();
      this.dataMode = this.client.status.mode;
      const code = preferredCinema || this.prefs.recent[0] || this.prefs.favorites[0];
      if (code) {
        const cinema = this.cinemas.find((c) => c.externalCode === code);
        if (cinema) await this.selectCinema(cinema, false);
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to load cinemas";
    } finally {
      this.loadingCinemas = false;
    }
  }

  private persist(): void {
    savePrefs(this.prefs);
    writeUrlState({
      cinema: this.selectedCinema?.externalCode,
      date: this.selectedDate,
      films: this.selectedFilmIds,
      api: this.prefs.apiBase || undefined
    });
  }

  private async selectCinema(cinema: Cinema, resetFilms = true): Promise<void> {
    this.selectedCinema = cinema;
    this.prefs = pushRecent(this.prefs, cinema.externalCode);
    if (resetFilms) {
      this.selectedFilmIds = [];
      this.selectedScreeningIds = [];
      this.lockedFilmIds = [];
    }
    this.persist();
    await this.loadListings();
  }

  private async loadListings(): Promise<void> {
    if (!this.selectedCinema) return;
    this.loadingListings = true;
    this.error = null;
    try {
      const payload = await this.client.getListings(
        this.selectedCinema.externalCode,
        this.selectedDate
      );
      this.dataMode = this.client.status.mode;
      this.films = [...payload.body.films].sort((a, b) => a.weight - b.weight || a.name.localeCompare(b.name));
      this.screenings = payload.body.events;
      this.selectedFilmIds = this.selectedFilmIds.filter((id) =>
        this.films.some((f) => f.id === id)
      );
      this.selectedScreeningIds = this.selectedScreeningIds.filter((id) =>
        this.screenings.some((s) => s.id === id)
      );
    } catch (err) {
      this.error = err instanceof Error ? err.message : "Failed to load listings";
      this.films = [];
      this.screenings = [];
    } finally {
      this.loadingListings = false;
      this.persist();
    }
  }

  private filteredCinemas(): Cinema[] {
    let list = this.cinemas;
    if (this.cinemaQuery.trim()) {
      list = fuzzyFilter(list, this.cinemaQuery, (c) => `${c.name} ${c.address.city} ${c.address.postalCode}`);
    }
    const fav = new Set(this.prefs.favorites);
    const recent = new Set(this.prefs.recent);
    list = [...list].sort((a, b) => {
      const af = fav.has(a.externalCode) ? 1 : 0;
      const bf = fav.has(b.externalCode) ? 1 : 0;
      if (af !== bf) return bf - af;
      const ar = recent.has(a.externalCode) ? 1 : 0;
      const br = recent.has(b.externalCode) ? 1 : 0;
      if (ar !== br) return br - ar;
      if (this.showNearMe && this.geo) {
        const da = distanceKm(this.geo.lat, this.geo.lon, a.latitude, a.longitude);
        const db = distanceKm(this.geo.lat, this.geo.lon, b.latitude, b.longitude);
        return da - db;
      }
      return a.name.localeCompare(b.name);
    });
    return list.slice(0, 60);
  }

  private selectedFilms(): Film[] {
    return this.films.filter((f) => this.selectedFilmIds.includes(f.id));
  }

  private filmColor(filmId: string): string {
    const idx = this.selectedFilmIds.indexOf(filmId);
    return FILM_COLORS[idx % FILM_COLORS.length]!;
  }

  private visibleScreenings(): Screening[] {
    const films = new Set(this.selectedFilmIds);
    return this.screenings
      .filter((s) => films.has(s.filmId))
      .filter((s) => matchesFilters(this.prefs.filters, s))
      .filter((s) => {
        if (this.earliest) {
          const [h, m] = this.earliest.split(":").map(Number);
          const start = screeningStart(s);
          if (start.getHours() < h! || (start.getHours() === h && start.getMinutes() < m!)) {
            return false;
          }
        }
        if (this.latest) {
          const [h, m] = this.latest.split(":").map(Number);
          const end = screeningEnd(s, this.films, this.prefs.trailerMinutes);
          const endMin = end.getHours() * 60 + end.getMinutes();
          if (endMin > h! * 60 + m!) return false;
        }
        return true;
      })
      .sort((a, b) => screeningStart(a).getTime() - screeningStart(b).getTime());
  }

  private manualPlan(): GeneratedPlan | null {
    const picked = this.screenings.filter((s) => this.selectedScreeningIds.includes(s.id));
    if (picked.length === 0) return null;
    return summarizePlan(picked, this.films, this.prefs.trailerMinutes);
  }

  private generatedPlans(): GeneratedPlan[] {
    return generateItineraries(this.visibleScreenings(), this.films, {
      trailerMinutes: this.prefs.trailerMinutes,
      maxBreakMinutes: this.prefs.maxBreakMinutes,
      mustIncludeFilmIds: this.lockedFilmIds,
      sort: this.sort,
      limit: 24
    });
  }

  private showToast(message: string): void {
    this.toast = message;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast = null;
    }, 2200);
  }

  private requestGeo(): void {
    if (!navigator.geolocation) {
      this.showToast("Geolocation not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.geo = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        this.showNearMe = true;
        this.showToast("Sorted by distance");
      },
      () => this.showToast("Could not get location")
    );
  }

  private toggleTheme(): void {
    const order: PlannerPrefs["theme"][] = ["dark", "light", "system"];
    const next = order[(order.indexOf(this.prefs.theme) + 1) % order.length]!;
    this.prefs = { ...this.prefs, theme: next };
    savePrefs(this.prefs);
    this.applyTheme();
  }

  protected render() {
    const cinemas = this.filteredCinemas();
    const selectedFilms = this.selectedFilms();
    const visible = this.visibleScreenings();
    const manual = this.manualPlan();
    const plans = selectedFilms.length >= 2 ? this.generatedPlans() : [];

    return html`
      <div class="shell">
        <header class="top">
          <div class="top-row">
            <div class="brand">
              <h1>screenplan</h1>
              <p>Multi-film Cineworld planner — timelines, auto itineraries, shareable links.</p>
            </div>
            <div class="actions">
              <button type="button" class="ghost" @click=${() => this.toggleTheme()} title="Toggle theme">
                Theme: ${this.prefs.theme}
              </button>
              <a class="btn" href="https://github.com/Davidhanson90/screenplan" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
          ${this.dataMode === "live"
            ? html`<div class="banner live" role="status">
                Live listings via cineworld-planner API${this.client.status.via === "proxy"
                  ? " (proxy)"
                  : this.client.status.via === "direct"
                    ? " (direct)"
                    : ""}
              </div>`
            : html`<div class="banner" role="status">
                Demo data / last refreshed:
                ${this.refreshedAt
                  ? new Date(this.refreshedAt).toLocaleString()
                  : "bundled snapshot"}
                · Live API optional via <code>?api=</code>
              </div>`}
        </header>

        ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}

        <section class="panel" aria-labelledby="cinema-heading">
          <h2 id="cinema-heading">1. Cinema</h2>
          <div class="controls">
            <label class="field">
              Search
              <input
                type="search"
                placeholder="Fuzzy search name, city, postcode…"
                .value=${this.cinemaQuery}
                @input=${(e: Event) => {
                  this.cinemaQuery = (e.target as HTMLInputElement).value;
                }}
              />
            </label>
            <div class="actions" style="align-items:end">
              <button type="button" @click=${() => this.requestGeo()}>Near me</button>
              <button
                type="button"
                class=${this.showNearMe ? "active" : ""}
                ?disabled=${!this.geo}
                @click=${() => {
                  this.showNearMe = !this.showNearMe;
                }}
              >
                Sort by distance
              </button>
            </div>
          </div>
          ${this.loadingCinemas
            ? html`<div class="skeleton" aria-busy="true"></div>`
            : cinemas.length === 0
              ? html`<div class="empty">No cinemas match your search.</div>`
              : html`<ul class="cinema-list" role="listbox" aria-label="Cinemas">
                  ${cinemas.map((c) => {
                    const fav = this.prefs.favorites.includes(c.externalCode);
                    const dist =
                      this.geo
                        ? formatDistance(
                            distanceKm(this.geo.lat, this.geo.lon, c.latitude, c.longitude)
                          )
                        : null;
                    return html`<li>
                      <button
                        type="button"
                        class="cinema-item ${this.selectedCinema?.externalCode === c.externalCode
                          ? "selected"
                          : ""}"
                        role="option"
                        aria-selected=${this.selectedCinema?.externalCode === c.externalCode}
                        @click=${() => void this.selectCinema(c)}
                      >
                        <span
                          class="pin"
                          title=${fav ? "Unpin favourite" : "Pin favourite"}
                          @click=${(e: Event) => {
                            e.stopPropagation();
                            this.prefs = toggleFavorite(this.prefs, c.externalCode);
                            savePrefs(this.prefs);
                            this.requestUpdate();
                          }}
                          >${fav ? "★" : "☆"}</span
                        >
                        <span>
                          <strong>${c.name}</strong>
                          <div class="meta">${c.address.city} · ${c.address.postalCode}</div>
                        </span>
                        <span class="meta">${dist ?? ""}</span>
                      </button>
                    </li>`;
                  })}
                </ul>`}
          ${this.selectedCinema
            ? html`<p class="muted" style="margin-top:12px">
                Selected:
                <a href=${this.selectedCinema.websiteUrl} target="_blank" rel="noreferrer"
                  >${this.selectedCinema.name}</a
                >
                ·
                <a
                  href=${`https://www.google.com/maps/search/?api=1&query=${this.selectedCinema.latitude},${this.selectedCinema.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  >Maps</a
                >
              </p>`
            : nothing}
        </section>

        <section class="panel" aria-labelledby="day-heading">
          <h2 id="day-heading">2. Day & filters</h2>
          <div class="dates" role="tablist" aria-label="Days">
            ${this.dates.map(
              (d) => html`<button
                type="button"
                class="date-btn ${this.selectedDate === d ? "active primary" : ""}"
                role="tab"
                aria-selected=${this.selectedDate === d}
                @click=${() => {
                  this.selectedDate = d;
                  this.persist();
                  void this.loadListings();
                }}
              >
                ${formatDateLabel(d)}
              </button>`
            )}
          </div>
          <div style="margin-top:14px">
            <div class="muted" style="margin-bottom:6px">Formats (click: off → include → exclude)</div>
            <div class="chips">
              ${FORMAT_ATTRIBUTES.map((attr) => this.renderFilterChip(attr))}
            </div>
            <div class="muted" style="margin:10px 0 6px">Accessibility</div>
            <div class="chips">
              ${ACCESS_ATTRIBUTES.map((attr) => this.renderFilterChip(attr))}
            </div>
          </div>
          <div class="controls">
            <label class="field"
              >Trailer allowance (min)
              <input
                type="number"
                min="0"
                max="60"
                .value=${String(this.prefs.trailerMinutes)}
                @change=${(e: Event) => {
                  this.prefs = {
                    ...this.prefs,
                    trailerMinutes: Math.max(0, Number((e.target as HTMLInputElement).value) || 0)
                  };
                  savePrefs(this.prefs);
                }}
              />
            </label>
            <label class="field"
              >Max break (min)
              <input
                type="number"
                min="0"
                max="240"
                .value=${String(this.prefs.maxBreakMinutes)}
                @change=${(e: Event) => {
                  this.prefs = {
                    ...this.prefs,
                    maxBreakMinutes: Math.max(0, Number((e.target as HTMLInputElement).value) || 0)
                  };
                  savePrefs(this.prefs);
                }}
              />
            </label>
            <label class="field"
              >Travel / buffer tip (min)
              <input
                type="number"
                min="0"
                max="60"
                .value=${String(this.prefs.bufferMinutes)}
                @change=${(e: Event) => {
                  this.prefs = {
                    ...this.prefs,
                    bufferMinutes: Math.max(0, Number((e.target as HTMLInputElement).value) || 0)
                  };
                  savePrefs(this.prefs);
                }}
              />
            </label>
            <label class="field"
              >Earliest start
              <input
                type="time"
                .value=${this.earliest}
                @change=${(e: Event) => {
                  this.earliest = (e.target as HTMLInputElement).value;
                }}
              />
            </label>
            <label class="field"
              >Latest finish
              <input
                type="time"
                .value=${this.latest}
                @change=${(e: Event) => {
                  this.latest = (e.target as HTMLInputElement).value;
                }}
              />
            </label>
          </div>
          <p class="muted" style="margin-top:10px">
            Buffer tip is advisory text only (separate from trailer allowance used in end-time estimates).
          </p>
        </section>

        <section class="panel" aria-labelledby="films-heading">
          <h2 id="films-heading">3. Films</h2>
          ${!this.selectedCinema
            ? html`<div class="empty">Pick a cinema to load films.</div>`
            : this.loadingListings
              ? html`<div class="skeleton" aria-busy="true"></div>`
              : this.films.length === 0
                ? html`<div class="empty">No films listed for this day (demo snapshot may be limited).</div>`
                : html`<div class="film-grid">
                    ${this.films.map((film) => this.renderFilmCard(film))}
                  </div>`}
        </section>

        ${selectedFilms.length
          ? html`<section class="panel" aria-labelledby="timeline-heading">
              <div class="top-row">
                <h2 id="timeline-heading" style="margin:0">4. Timeline</h2>
                <div class="actions">
                  <button
                    type="button"
                    class="ghost"
                    @click=${() => {
                      this.selectedScreeningIds = [];
                    }}
                  >
                    Clear picks
                  </button>
                </div>
              </div>
              ${visible.length === 0
                ? html`<div class="empty">No screenings match filters / time window.</div>`
                : this.renderTimeline(visible)}
              ${manual ? this.renderPlanBlock("Your picks", manual, true) : nothing}
            </section>`
          : nothing}

        ${selectedFilms.length >= 2
          ? html`<section class="panel" aria-labelledby="auto-heading">
              <div class="top-row">
                <h2 id="auto-heading" style="margin:0">5. Auto itineraries</h2>
                <label class="field" style="min-width:180px">
                  Sort
                  <select
                    .value=${this.sort}
                    @change=${(e: Event) => {
                      this.sort = (e.target as HTMLSelectElement).value as ItinerarySort;
                    }}
                  >
                    <option value="fewest-wait">Fewest wait</option>
                    <option value="earliest-finish">Earliest finish</option>
                    <option value="shortest-span">Shortest span</option>
                  </select>
                </label>
              </div>
              <p class="muted">
                Lock films with the padlock on a card to force “must include”. Showing up to
                ${plans.length} plans.
              </p>
              ${plans.length === 0
                ? html`<div class="empty">No compatible multi-film plans with current constraints.</div>`
                : html`<div class="plan-list">
                    ${plans.map((p, i) => this.renderPlanBlock(`Plan ${i + 1}`, p, false))}
                  </div>`}
            </section>`
          : nothing}

        <footer>
          Unofficial fan project — not affiliated with Cineworld.
          Inspired by
          <a href="https://github.com/Roaders/cineworld-planner" target="_blank" rel="noreferrer"
            >Roaders/cineworld-planner</a
          >.
          MIT License ·
          <a href="https://davidhanson90.github.io/screenplan/">Pages demo</a>
        </footer>
      </div>
      ${this.toast ? html`<div class="toast" role="status">${this.toast}</div>` : nothing}
    `;
  }

  private renderFilterChip(attr: FilmAttribute) {
    const existing = this.prefs.filters.find((f) => f.attribute === attr);
    const mode = existing?.mode ?? "off";
    const meta = chipAttributes([attr])[0];
    return html`<button
      type="button"
      class="chip ${mode}"
      title="Filter ${meta?.label ?? attr}: ${mode}"
      @click=${() => {
        const next = cycleFilterMode(mode);
        this.prefs = {
          ...this.prefs,
          filters: upsertFilter(this.prefs.filters, attr, next)
        };
        savePrefs(this.prefs);
      }}
    >
      ${meta?.short ?? attr}${mode === "include" ? " ✓" : mode === "exclude" ? " ✕" : ""}
    </button>`;
  }

  private renderFilmCard(film: Film) {
    const selected = this.selectedFilmIds.includes(film.id);
    const locked = this.lockedFilmIds.includes(film.id);
    const chips = chipAttributes(
      this.screenings
        .filter((s) => s.filmId === film.id)
        .flatMap((s) => s.attributeIds)
        .filter((v, i, a) => a.indexOf(v) === i)
    ).slice(0, 4);
    return html`<button
      type="button"
      class="film-card ${selected ? "selected" : ""} ${locked ? "locked" : ""}"
      @click=${() => {
        if (selected) {
          this.selectedFilmIds = this.selectedFilmIds.filter((id) => id !== film.id);
          this.lockedFilmIds = this.lockedFilmIds.filter((id) => id !== film.id);
          this.selectedScreeningIds = this.selectedScreeningIds.filter((id) => {
            const s = this.screenings.find((x) => x.id === id);
            return s && s.filmId !== film.id;
          });
        } else {
          this.selectedFilmIds = [...this.selectedFilmIds, film.id];
        }
        this.persist();
      }}
    >
      <div class="poster">
        ${film.posterLink
          ? html`<img
              src=${film.posterLink}
              alt=""
              loading="lazy"
              @error=${(e: Event) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />`
          : html`<span>No poster</span>`}
      </div>
      <div class="film-body">
        <strong>${film.name}</strong>
        <span class="muted">${film.length ? `${Math.round(film.length)} min` : "Runtime n/a"}
          ${film.releaseYear ? `· ${film.releaseYear}` : ""}</span
        >
        <div class="chips">
          ${chips.map((c) => html`<span class="badge">${c.short}</span>`)}
        </div>
        <div class="actions">
          ${film.link
            ? html`<a
                href=${film.link}
                target="_blank"
                rel="noreferrer"
                @click=${(e: Event) => e.stopPropagation()}
                >Film</a
              >`
            : nothing}
          ${film.videoLink
            ? html`<a
                href=${film.videoLink}
                target="_blank"
                rel="noreferrer"
                @click=${(e: Event) => e.stopPropagation()}
                >Trailer</a
              >`
            : nothing}
          ${selected
            ? html`<button
                type="button"
                class="ghost"
                title="Must include when generating"
                @click=${(e: Event) => {
                  e.stopPropagation();
                  this.lockedFilmIds = locked
                    ? this.lockedFilmIds.filter((id) => id !== film.id)
                    : [...this.lockedFilmIds, film.id];
                }}
              >
                ${locked ? "🔒" : "🔓"}
              </button>`
            : nothing}
        </div>
      </div>
    </button>`;
  }

  private renderTimeline(visible: Screening[]) {
    const starts = visible.map((s) => screeningStart(s).getTime());
    const ends = visible.map((s) =>
      screeningEnd(s, this.films, this.prefs.trailerMinutes).getTime()
    );
    const min = Math.min(...starts);
    const max = Math.max(...ends);
    const span = Math.max(max - min, 1);
    const byFilm = this.selectedFilmIds.map((id) => ({
      film: this.films.find((f) => f.id === id)!,
      items: visible.filter((s) => s.filmId === id)
    }));

    return html`<div class="timeline-wrap">
      <div class="timeline" role="list">
        ${byFilm.map(
          ({ film, items }) => html`<div class="row" role="listitem">
            <div>
              <strong style="color:${this.filmColor(film.id)}">${film.name}</strong>
            </div>
            <div class="track">
              ${items.map((s) => {
                const start = screeningStart(s).getTime();
                const end = screeningEnd(s, this.films, this.prefs.trailerMinutes).getTime();
                const left = ((start - min) / span) * 100;
                const width = Math.max(((end - start) / span) * 100, 1.5);
                const picked = this.selectedScreeningIds.includes(s.id);
                return html`<button
                  type="button"
                  class="bar ${picked ? "picked" : ""}"
                  style="left:${left}%;width:${width}%;background:${this.filmColor(s.filmId)}"
                  title="${formatClock(screeningStart(s))}–${formatClock(
                    screeningEnd(s, this.films, this.prefs.trailerMinutes)
                  )}"
                  @click=${() => {
                    this.selectedScreeningIds = picked
                      ? this.selectedScreeningIds.filter((id) => id !== s.id)
                      : [...this.selectedScreeningIds, s.id];
                  }}
                >
                  ${formatClock(screeningStart(s))}
                </button>`;
              })}
            </div>
          </div>`
        )}
      </div>
    </div>`;
  }

  private renderPlanBlock(title: string, plan: GeneratedPlan, isManual: boolean) {
    return html`<div class="plan-card">
      <div class="top-row">
        <strong>${title}</strong>
        <div class="actions">
          ${plan.hasOverlap
            ? html`<span class="badge danger">Conflict</span>`
            : nothing}
          ${plan.hasTightConnection
            ? html`<span class="badge warn">Tight connection</span>`
            : nothing}
          <span class="badge">${plan.screenings.length} films</span>
          <span class="badge">wait ${plan.totalWaitMinutes}m</span>
          <span class="badge">span ${plan.spanMinutes}m</span>
        </div>
      </div>
      <div class="itinerary">
        ${plan.segments.map((seg) => {
          if (seg.kind === "screening") {
            return html`<div class="seg">
              <strong>${formatClock(seg.start)}–${formatClock(seg.end)}</strong>
              ${seg.filmName}
              ${seg.screening?.bookingLink
                ? html`·
                    <a href=${seg.screening.bookingLink} target="_blank" rel="noreferrer"
                      >Book</a
                    >`
                : nothing}
            </div>`;
          }
          if (seg.kind === "break") {
            return html`<div class="seg break ${seg.tight ? "tight" : ""}">
              ${seg.minutes} min break
              ${seg.tight ? html`<span class="badge warn">tight</span>` : nothing}
              ${this.prefs.bufferMinutes
                ? html`<span class="muted"
                    >· leave ~${this.prefs.bufferMinutes} min buffer between auditoriums</span
                  >`
                : nothing}
            </div>`;
          }
          return html`<div class="seg overlap">
            ${seg.minutes} min overlap <span class="badge danger">conflict</span>
          </div>`;
        })}
      </div>
      <div class="actions">
        <button
          type="button"
          class="primary"
          @click=${async () => {
            const text = planToPlainText(
              plan,
              this.selectedCinema?.name ?? "Cinema",
              this.selectedDate,
              this.prefs.bufferMinutes
            );
            try {
              await navigator.clipboard.writeText(text);
              this.showToast("Itinerary copied");
            } catch {
              this.showToast("Copy failed");
            }
          }}
        >
          Copy as text
        </button>
        <button
          type="button"
          @click=${() => {
            const links = plan.screenings
              .map((s) => s.bookingLink)
              .filter(Boolean);
            if (!links.length) {
              this.showToast("No booking links");
              return;
            }
            for (const link of links) window.open(link, "_blank", "noopener,noreferrer");
          }}
        >
          Open all booking links
        </button>
        ${!isManual
          ? html`<button
              type="button"
              class="ghost"
              @click=${() => {
                this.selectedScreeningIds = plan.screenings.map((s) => s.id);
                this.showToast("Applied to picks");
              }}
            >
              Use as picks
            </button>`
          : nothing}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sp-app": SpApp;
  }
}
