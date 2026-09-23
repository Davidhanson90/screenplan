# screenplan-api

Express reverse proxy for the [Roaders cineworld-planner](https://github.com/Roaders/cineworld-planner) live API.

Upstream default: `https://api.kingshill.cineworld-planner.co.uk:43000`  
Override with `UPSTREAM_API`.

## Why

The kingshill API’s CORS allowlist is only `cineworld-planner.co.uk` and `localhost:4200`. Browser calls from GitHub Pages or Vite `:5173` are blocked. This server fetches server-side (no `Origin`) and re-exposes the same routes with a screenplan-friendly CORS allowlist.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/cinema` | Proxied cinema list |
| `GET` | `/cinema/:code/listings/:YYYY-MM-DD` | Proxied films + screenings |
| `GET` | `/health` | Liveness + upstream URL |

If the upstream request fails, routes fall back to the local Cineworld scrape (`CinemaService`).

CORS allows `localhost:5173` / `4173` (and `127.0.0.1`) plus `https://davidhanson90.github.io`. Rate limit: 60 req/min per IP on `/cinema`.

## Run

```sh
npm install
npm run dev   # http://localhost:3000
```

```sh
UPSTREAM_API=https://api.kingshill.cineworld-planner.co.uk:43000 npm run dev
```
