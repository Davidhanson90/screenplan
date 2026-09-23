# screenplan

Modern multi-film **Cineworld** planner. Pick a cinema, choose a day, select several films, compare colour-coded screenings on a timeline, and auto-generate conflict-free itineraries.

**Demo:** [https://davidhanson90.github.io/screenplan/](https://davidhanson90.github.io/screenplan/)

Inspired by [Roaders/cineworld-planner](https://github.com/Roaders/cineworld-planner).

> **Disclaimer:** Unofficial fan project — **not affiliated with Cineworld**. Listing data is scraped from public Cineworld endpoints for personal planning convenience and may be incomplete or out of date.

## Features

- Fuzzy cinema search, favourites, recent cinemas, and distance / “near me”
- Next ~7 days of films & screenings with format / accessibility chips (2D, 3D, 4DX, ScreenX, Superscreen, subtitled, AD, …)
- Colour-coded mobile-friendly timeline; sticky header; dark-first UI with light / system theme toggle
- Trailer allowance, earliest start / latest finish, max break, and a separate travel/buffer tip
- Manual picks with overlap / break / tight-connection feedback
- Auto-generated multi-film itineraries with sort (fewest wait, earliest finish, shortest span) and “must include” film locks
- Shareable URL state (`?cinema=&date=&films=`); one-click copy itinerary; open all booking links
- Offline-friendly GitHub Pages demo via refreshed snapshot data + optional live API (`?api=`)

## Stack

- Frontend: TypeScript, Vite, Lit (same family as learnplay / quakevolve)
- API: Express + TypeScript in `/api`
- Tests: Vitest · Lint: ESLint
- CI: verify, Pages deploy, scheduled data refresh

## Quick start (frontend)

```sh
npm ci
npm start
```

Opens Vite on `http://localhost:5173/screenplan/`.

With no live API, the app loads `public/data/...` snapshots (demo mode banner).

### Point at a live API

```text
http://localhost:5173/screenplan/?api=http://localhost:3000
```

Or the original planner API while developing locally (browser CORS only allows that API’s own origins — GitHub Pages **cannot** call it):

```text
?api=https://api.kingshill.cineworld-planner.co.uk:43000
```

## API server

```sh
npm run api:install
npm run api:dev
```

Routes:

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/cinema` | Cinema list (cached ~1h) |
| `GET` | `/cinema/:code/listings/:YYYY-MM-DD` | Films + screenings (cached ~10m) |
| `GET` | `/health` | Liveness |

CORS allows `localhost:5173` / `4173` and `https://davidhanson90.github.io`. Rate limit: 60 req/min per IP on `/cinema`.

## Snapshot data (Pages)

```sh
npm run data:refresh
```

Fetches Cineworld (or falls back to the public original API server-side) and writes:

- `public/data/cinemas.json`
- `public/data/listings/{code}/{date}.json`
- `public/data/meta.json`

GitHub Action runs this on a schedule and before Pages deploy.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Vite dev server |
| `npm run build` | Production build (`base: /screenplan/`) |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run build:verify` | test + lint + build |
| `npm run api:dev` | API with reload |
| `npm run data:refresh` | Refresh demo snapshots |

## Data strategy

1. **Own API** — maps Cineworld public schedule / movie JSON into a stable cinema + listings contract.
2. **Pages snapshots** — Action refreshes JSON under `public/data` so the static site works without a browser-callable API (CORS).
3. **Frontend client** — tries configurable live `apiBase`, else relative `/screenplan/data/...`.

## License

MIT
