import { TtlCache } from "./cache.js";
import { loadAllCinemas, loadListings } from "./cineworld-client.js";
import type { Cinema, ListingsPayload } from "./types.js";

const CINEMA_TTL = 60 * 60 * 1000;
const LISTINGS_TTL = 10 * 60 * 1000;

export class CinemaService {
  private cache = new TtlCache();

  async getCinemas(): Promise<Cinema[]> {
    const cached = this.cache.get<Cinema[]>("cinemas");
    if (cached) return cached;
    const cinemas = await loadAllCinemas();
    this.cache.set("cinemas", cinemas, CINEMA_TTL);
    return cinemas;
  }

  async getListings(code: string, date: string): Promise<ListingsPayload> {
    const key = `listings:${code}:${date}`;
    const cached = this.cache.get<ListingsPayload>(key);
    if (cached) return cached;
    const listings = await loadListings(code, date);
    this.cache.set(key, listings, LISTINGS_TTL);
    return listings;
  }
}
