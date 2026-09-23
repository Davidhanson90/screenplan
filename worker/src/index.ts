/**
 * Cloudflare Worker: CORS bridge for screenplan → kingshill cineworld-planner API.
 * Deploy: cd worker && npx wrangler deploy
 */

const DEFAULT_UPSTREAM = "https://api.kingshill.cineworld-planner.co.uk:43000";

const ALLOWED_ORIGINS = new Set([
  "https://davidhanson90.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
]);

export interface Env {
  UPSTREAM_API?: string;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://davidhanson90.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function json(data: unknown, request: Request, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...extra
    }
  });
}

function cacheControlFor(path: string): string {
  if (path === "/cinema") return "public, max-age=300";
  if (path.includes("/listings/")) return "public, max-age=60";
  return "public, max-age=30";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, request, 405);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/health") {
      return json(
        {
          ok: true,
          service: "screenplan-proxy",
          upstream: (env.UPSTREAM_API || DEFAULT_UPSTREAM).replace(/\/$/, "")
        },
        request
      );
    }

    if (path !== "/cinema" && !/^\/cinema\/[^/]+\/listings\/\d{4}-\d{2}-\d{2}$/.test(path)) {
      return json({ error: "Not found" }, request, 404);
    }

    const upstreamBase = (env.UPSTREAM_API || DEFAULT_UPSTREAM).replace(/\/$/, "");
    const upstreamUrl = `${upstreamBase}${path}${url.search}`;

    try {
      const upstream = await fetch(upstreamUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "screenplan-cf-proxy/1.0"
        },
        cf: {
          // Short edge cache; listings change during the day
          cacheTtl: path === "/cinema" ? 300 : 60,
          cacheEverything: true
        }
      });

      const body = await upstream.text();
      const headers: HeadersInit = {
        ...corsHeaders(request),
        "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
        "Cache-Control": cacheControlFor(path)
      };

      return new Response(body, { status: upstream.status, headers });
    } catch (err) {
      return json(
        {
          error: "Upstream fetch failed",
          detail: err instanceof Error ? err.message : String(err)
        },
        request,
        502
      );
    }
  }
} satisfies ExportedHandler<Env>;
