import { describe, expect, it } from "vitest";
import { mapListings, mapTheaters } from "./mapper.js";
import type { Movie, Schedule, TheaterResponse } from "./types.js";

describe("mapper", () => {
  it("maps theaters", () => {
    const response: TheaterResponse = {
      data: {
        allTheater: {
          nodes: [
            {
              id: "X079Z",
              name: "Aberdeen Queens Links",
              path: "/theaters/x079z-cineworld-cinema-aberdeen-queens-links",
              practicalInfo: {
                coordinates: { latitude: 57.15, longitude: -2.07 },
                location: {
                  address: "Queens Links",
                  city: "Aberdeen",
                  zip: "AB24 5EN",
                  state: "Scotland"
                }
              }
            }
          ]
        }
      }
    };
    const cinemas = mapTheaters(response, "https://www.cineworld.co.uk", "", "/cinemas/");
    expect(cinemas[0]?.externalCode).toBe("X079Z");
    expect(cinemas[0]?.websiteUrl).toContain("/cinemas/");
  });

  it("maps listings with tags", () => {
    const schedule: Schedule = {
      m1: {
        "2026-09-23": [
          {
            id: "s1",
            startsAt: "2026-09-23T18:00:00",
            tags: ["attribute.soundFormat.digital", "attribute.experience.4dx"],
            data: { ticketing: [{ provider: "default", type: "standard", urls: ["https://book"] }] }
          }
        ]
      }
    };
    const movies: Movie[] = [
      {
        id: "m1",
        title: "Demo",
        runtime: 6000,
        poster: "https://img",
        release: "2026-01-01",
        certificate: "12a",
        genres: "action,comedy",
        orderIndex: 1,
        trailer: { HD: "https://trailer" }
      }
    ];
    const listings = mapListings("X079Z", schedule, movies, "https://www.cineworld.co.uk", "/films/");
    expect(listings.body.films[0]?.length).toBe(100);
    expect(listings.body.events[0]?.attributeIds).toContain("4dx");
    expect(listings.body.events[0]?.attributeIds).toContain("2d");
    expect(listings.body.events[0]?.bookingLink).toBe("https://book");
  });
});
