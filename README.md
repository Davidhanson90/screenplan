# screenplan

Modern multi-film **Cineworld** planner. Pick a cinema, choose a day, select several films, compare colour-coded screenings on a timeline, and auto-generate conflict-free itineraries.

**Demo:** [https://davidhanson90.github.io/screenplan/](https://davidhanson90.github.io/screenplan/)

Inspired by [Roaders/cineworld-planner](https://github.com/Roaders/cineworld-planner). Live listing data comes from their running API at `https://api.kingshill.cineworld-planner.co.uk:43000`.

> **Disclaimer:** Unofficial fan project — **not affiliated with Cineworld**. Listing data may be incomplete or out of date.

## Features

- Fuzzy cinema search, favourites, recent cinemas, and distance / “near me”
- Next ~7 days of films & screenings with format / accessibility chips (2D, 3D, 4DX, ScreenX, Superscreen, subtitled, AD, …)
- Colour-coded mobile-friendly timeline; sticky header; dark-first UI with light / system theme toggle
- Trailer allowance, earliest start / latest finish, max break, and a separate travel/buffer tip
- Manual picks with overlap / break / tight-connection feedback
- Auto-generated multi-film itineraries with sort (fewest wait, earliest finish, shortest span) and “must include” film locks
- Shareable URL state (`?cinema=&date=&films=`); one-click copy itinerary; open all booking links
- Live mode via proxy, or offline-friendly GitHub Pages snapshots refreshed from the same upstream API

## Stack

- Frontend: TypeScript, Vite, Lit (same family as learnplay / quakevolve)
- API: Express reverse proxy in `/api` (proxies Roaders cineworld-planner API)
- Pages CORS bridge: Cloudflare Worker in `/worker` (`screenplan-proxy`)
- Tests: Vitest · Lint: ESLint
- CI: verify, Pages deploy, scheduled data refresh

## Quick start (live locally)

```sh
npm ci
npm run api:install
npm run api:dev          # http://localhost:3000 — proxies kingshill
# other terminal:
npm start                # http://localhost:5173/screenplan/
```

On `localhost`, the frontend defaults to `http://localhost:3000`. Or force it:

```text
http://localhost:5173/screenplan/?api=http://localhost:3000
```

You should see the banner: **Live listings via cineworld-planner API (proxy)**.

## GitHub Pages behaviour

The kingshill API CORS allowlist is only `cineworld-planner.co.uk` + `localhost:4200`. Browser calls from `https://davidhanson90.github.io` are blocked.

**For live Pages today:**

1. **Deploy the Cloudflare Worker** (see [`worker/README.md`](worker/README.md)), then either:
   - set `KNOWN_WORKER_URL` in `src/lib/data-client.ts`, or
   - build with `VITE_API_BASE=https://screenplan-proxy.<account>.workers.dev`, or
   - open `?api=https://screenplan-proxy.<account>.workers.dev`
2. **Or** run the Express proxy somewhere public and pass `?api=…`.

**Until a proxy is deployed:** Pages tries the kingshill URL directly, fails CORS, and falls back to **bundled snapshots**. Those snapshots are refreshed on a schedule **from the kingshill API** (server-side), so demo data is still “their” service data.

## API server (proxy)

```sh
npm run api:install
npm run api:dev
```

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/cinema` | Proxied from upstream (scrape fallback) |
| `GET` | `/cinema/:code/listings/:YYYY-MM-DD` | Proxied listings |
| `GET` | `/health` | Liveness + upstream URL |

Env: `UPSTREAM_API` (default `https://api.kingshill.cineworld-planner.co.uk:43000`).

CORS allows `localhost:5173` / `4173` and `https://davidhanson90.github.io`. Rate limit: 60 req/min per IP on `/cinema`.

See [`api/README.md`](api/README.md).

## Cloudflare Worker

```sh
cd worker && npm install && npx wrangler deploy
```

Needs Cloudflare credentials. If none are available in CI/local env, the worker stays ready to deploy manually.

## Snapshot data (Pages)

```sh
npm run data:refresh
```

Pulls cinemas + listings from `UPSTREAM_API` (server-side) into:

- `public/data/cinemas.json`
- `public/data/listings/{code}/{date}.json`
- `public/data/meta.json`

Optional `SCREENPLAN_DIRECT=1` scrapes Cineworld instead. GitHub Action runs this on a schedule and can commit updates.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Vite dev server |
| `npm run build` | Production build (`base: /screenplan/`) |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run build:verify` | test + lint + build |
| `npm run api:dev` | API proxy with reload |
| `npm run data:refresh` | Refresh demo snapshots from upstream |
| `npm run verify` | Frontend + API build/tests |

## Data strategy

1. **Upstream API** — Roaders cineworld-planner at kingshill (canonical live source).
2. **Express / CF Worker proxies** — same routes, CORS for screenplan origins.
3. **Pages snapshots** — Action refreshes JSON from upstream so the static site works without a browser-callable proxy.
4. **Frontend client** — tries live `apiBase` (env / worker / local / direct), else `/screenplan/data/...`.

## License

MIT
