# screenplan-proxy (Cloudflare Worker)

Always-on CORS bridge so GitHub Pages can call the Roaders cineworld-planner API.

Proxies:

- `GET /cinema`
- `GET /cinema/:code/listings/:YYYY-MM-DD`
- `GET /health`

Sets `Access-Control-Allow-Origin` for `https://davidhanson90.github.io` (and local Vite ports). Handles `OPTIONS`. Short `Cache-Control` on responses.

## Deploy

Requires a Cloudflare account + `CLOUDFLARE_API_TOKEN` (or `wrangler login`).

```sh
cd worker
npm install
npx wrangler deploy
```

After deploy, set the Workers URL as the frontend API base:

```sh
# example: https://screenplan-proxy.<account>.workers.dev
VITE_API_BASE=https://screenplan-proxy.YOUR_SUBDOMAIN.workers.dev npm run build
```

Or open Pages with `?api=https://screenplan-proxy.YOUR_SUBDOMAIN.workers.dev`.

Update `KNOWN_WORKER_URL` in `src/lib/data-client.ts` once a stable URL exists so Pages picks it up without query params.

## Local

```sh
npm install
npx wrangler dev
```
