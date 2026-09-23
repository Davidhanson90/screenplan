import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { CinemaService } from "./cinema-service.js";
import { isValidIsoDate, parseCinemaCode } from "./cineworld-client.js";

export function setupRoutes(app: Express, service = new CinemaService()): void {
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: "draft-7",
    legacyHeaders: false
  });

  app.use("/cinema", limiter);

  app.get("/cinema", async (_req: Request, res: Response) => {
    try {
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
    try {
      const listings = await service.getListings(code, date);
      res.json(listings);
    } catch (err) {
      console.error("listings error", err);
      res.status(502).json({ error: "Failed to load listings" });
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "screenplan-api" });
  });
}
