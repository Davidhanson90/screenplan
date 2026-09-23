import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { CinemaService } from "./cinema-service.js";
import { isValidIsoDate, parseCinemaCode } from "./cineworld-client.js";
import { fetchUpstream, upstreamBase } from "./upstream.js";

export function setupRoutes(app: Express, service = new CinemaService()): void {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false
  });

  app.use("/cinema", limiter);

  app.get("/cinema", async (_req: Request, res: Response) => {
    const proxied = await fetchUpstream("/cinema");
    if (proxied.ok) {
      res.json(proxied.data);
      return;
    }
    try {
      console.warn("upstream cinema list failed, falling back to scrape:", proxied.error);
      const cinemas = await service.getCinemas();
      res.json(cinemas);
    } catch (err) {
      console.error("cinema list error", err);
      res.status(502).json({ error: "Failed to load cinemas" });
    }
  });

  app.get("/cinema/:cinema/listings/:date", async (req: Request, res: Response) => {
    const code = String(req.params.cinema ?? "");
    const date = String(req.params.date ?? "");
    if (!parseCinemaCode(code) || !isValidIsoDate(date)) {
      res.status(400).json({ error: "Invalid cinema or date" });
      return;
    }
    const path = `/cinema/${encodeURIComponent(code)}/listings/${date}`;
    const proxied = await fetchUpstream(path);
    if (proxied.ok) {
      res.json(proxied.data);
      return;
    }
    try {
      console.warn("upstream listings failed, falling back to scrape:", proxied.error);
      const listings = await service.getListings(code, date);
      res.json(listings);
    } catch (err) {
      console.error("listings error", err);
      res.status(502).json({ error: "Failed to load listings" });
    }
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "screenplan-api",
      upstream: upstreamBase(),
      mode: "proxy"
    });
  });
}
