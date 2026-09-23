# screenplan

Modern multi-film **Cineworld** planner. Pick a cinema, choose a day, select several films, compare colour-coded screenings on a timeline, and auto-generate conflict-free itineraries.

**Demo:** [https://davidhanson90.github.io/screenplan/](https://davidhanson90.github.io/screenplan/)

Inspired by [Roaders/cineworld-planner](https://github.com/Roaders/cineworld-planner). Optional live listing data comes from their running API at `https://api.kingshill.cineworld-planner.co.uk:43000`.

> **Disclaimer:** Unofficial fan project — **not affiliated with Cineworld**. Listing data may be incomplete or out of date.

## Features

- Fuzzy cinema search, favourites, recent cinemas, and distance / “near me”
- Next ~7 days of films & screenings with format / accessibility chips (2D, 3D, 4DX, ScreenX, Superscreen, subtitled, AD, …)
- Colour-coded mobile-friendly timeline; sticky header; dark-first UI with light / system theme toggle
- Trailer allowance, earliest start / latest finish, max break, and a separate travel/buffer tip
- Manual picks with overlap / break / tight-connection feedback
- Auto-generated multi-film itineraries with sort (fewest wait, earliest finish, shortest span) and “must include” film locks
- Shareable URL state (`?cinema=&date=&films=`); one-click copy itinerary; open all booking links
- **GitHub Pages uses bundled fake demo data** so the planner always works offline; live mode via local proxy / `?api=`

## Stack

- Frontend: TypeScript, Vite, Lit (same family as learnplay / quakevolve)
- API: Express reverse proxy in `/api` (proxies Roaders cineworld-planner API)
- Pages CORS bridge (optional): Cloudflare Worker in `/worker` (`screenplan-proxy`)
- Tests: Vitest · Lint: ESLint
- CI: verify, Pages deploy, scheduled demo-data refresh

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

**Pages therefore does not attempt the live API by default.** `resolveApiBase()` returns `null` on Pages (unless you pass `?api=`, have a saved apiBase, set `VITE_API_BASE`, or configure `KNOWN_WORKER_URL`). The UI loads **fake demo listings** from `public/data/` so multi-film planning works immediately.

Banner copy: **Demo data (fake listings for trying the planner)**.

**For live on Pages (optional):**

1. Deploy the Cloudflare Worker (see [`worker/README.md`](worker/README.md)), then set `KNOWN_WORKER_URL` / `VITE_API_BASE` / `?api=…`
2. Or run the Express proxy somewhere public and pass `?api=…`

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

Needs Cloudflare credentials. Optional — not required for the Pages demo.

## Demo data (Pages)

```sh
npm run data:demo
```

Writes curated fake cinemas + dense listings under:

- `public/data/cinemas.json` (~10 UK demo sites)
- `public/data/listings/{code}/{date}.json` (next 7 Europe/London days)
- `public/data/meta.json` (`source: "fake-demo"`, `demo: true`)

Regenerate whenever you want rolling “today + 6” dates. A scheduled GitHub Action runs `data:demo` so Pages dates stay fresh.

Optional real upstream snapshots (sparse / may go stale):

```sh
npm run data:refresh
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Vite dev server |
| `npm run build` | Production build (`base: /screenplan/`) |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run build:verify` | test + lint + build |
| `npm run api:dev` | API proxy with reload |
| `npm run data:demo` | Generate fake demo listings for Pages |
| `npm run data:refresh` | Refresh snapshots from upstream (optional) |
| `npm run verify` | Frontend + API build/tests |

## Data strategy

1. **Pages fake demo** — `npm run data:demo` bundles rich synthetic listings; client uses them when `apiBase` is null.
2. **Upstream API** — Roaders cineworld-planner at kingshill (canonical live source).
3. **Express / CF Worker proxies** — same routes, CORS for screenplan origins.
4. **Frontend client** — tries live `apiBase` only when explicit / local / env / worker; else `/screenplan/data/...`.

## License

MIT
