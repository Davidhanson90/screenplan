import type {
  Film,
  GeneratedPlan,
  ItinerarySort,
  PlanSegment,
  Screening
} from "../types.js";
import { addMinutes, diffMinutes, parseIso } from "./time.js";

const TIGHT_CONNECTION_MINUTES = 10;

export function filmFor(screening: Screening, films: Film[]): Film | undefined {
  return films.find((f) => f.id === screening.filmId);
}

export function screeningStart(screening: Screening): Date {
  return parseIso(screening.eventDateTime);
}

export function screeningEnd(
  screening: Screening,
  films: Film[],
  trailerMinutes: number
): Date {
  const film = filmFor(screening, films);
  const runtime = film?.length ?? 0;
  return addMinutes(screeningStart(screening), trailerMinutes + runtime);
}

export function buildSegments(
  screenings: Screening[],
  films: Film[],
  trailerMinutes: number
): PlanSegment[] {
  const ordered = [...screenings].sort(
    (a, b) => screeningStart(a).getTime() - screeningStart(b).getTime()
  );
  const segments: PlanSegment[] = [];

  for (let i = 0; i < ordered.length; i += 1) {
    const s = ordered[i]!;
    const start = screeningStart(s);
    const end = screeningEnd(s, films, trailerMinutes);
    segments.push({
      kind: "screening",
      start,
      end,
      screening: s,
      filmName: filmFor(s, films)?.name ?? "Film"
    });

    if (i < ordered.length - 1) {
      const next = ordered[i + 1]!;
      const nextStart = screeningStart(next);
      const gap = diffMinutes(nextStart, end);
      if (gap >= 0) {
        segments.push({
          kind: "break",
          start: end,
          end: nextStart,
          minutes: gap,
          tight: gap > 0 && gap <= TIGHT_CONNECTION_MINUTES
        });
      } else {
        segments.push({
          kind: "overlap",
          start: nextStart,
          end,
          minutes: Math.abs(gap)
        });
      }
    }
  }

  return segments;
}

export function summarizePlan(
  screenings: Screening[],
  films: Film[],
  trailerMinutes: number
): GeneratedPlan {
  const segments = buildSegments(screenings, films, trailerMinutes);
  const screeningSegs = segments.filter((s) => s.kind === "screening");
  const breaks = segments.filter((s) => s.kind === "break");
  const startAt = screeningSegs[0]?.start ?? new Date();
  const finishAt = screeningSegs[screeningSegs.length - 1]?.end ?? startAt;
  return {
    screenings: [...screenings].sort(
      (a, b) => screeningStart(a).getTime() - screeningStart(b).getTime()
    ),
    segments,
    totalWaitMinutes: breaks.reduce((sum, b) => sum + (b.minutes ?? 0), 0),
    spanMinutes: Math.max(0, diffMinutes(finishAt, startAt)),
    finishAt,
    startAt,
    hasOverlap: segments.some((s) => s.kind === "overlap"),
    hasTightConnection: segments.some((s) => s.kind === "break" && s.tight)
  };
}

export interface GenerateOptions {
  trailerMinutes: number;
  maxBreakMinutes: number;
  mustIncludeFilmIds?: string[];
  earliestStart?: Date;
  latestFinish?: Date;
  sort?: ItinerarySort;
  limit?: number;
}

/**
 * Depth-first search for multi-film schedules where each next screening
 * starts after the previous finishes (incl. trailer) and within maxBreak.
 */
export function generateItineraries(
  candidates: Screening[],
  films: Film[],
  options: GenerateOptions
): GeneratedPlan[] {
  const {
    trailerMinutes,
    maxBreakMinutes,
    mustIncludeFilmIds = [],
    earliestStart,
    latestFinish,
    sort = "fewest-wait",
    limit = 40
  } = options;

  const byFilm = new Map<string, Screening[]>();
  for (const s of candidates) {
    if (earliestStart && screeningStart(s) < earliestStart) continue;
    const end = screeningEnd(s, films, trailerMinutes);
    if (latestFinish && end > latestFinish) continue;
    const list = byFilm.get(s.filmId) ?? [];
    list.push(s);
    byFilm.set(s.filmId, list);
  }
  for (const list of byFilm.values()) {
    list.sort((a, b) => screeningStart(a).getTime() - screeningStart(b).getTime());
  }

  const filmIds = [...byFilm.keys()];
  if (filmIds.length < 2) return [];

  const mustSet = new Set(mustIncludeFilmIds.filter((id) => byFilm.has(id)));
  const results: Screening[][] = [];

  function extend(path: Screening[]): void {
    if (results.length >= limit * 4) return;
    const used = new Set(path.map((p) => p.filmId));
    const last = path[path.length - 1]!;
    const lastEnd = screeningEnd(last, films, trailerMinutes);

    let advanced = false;
    for (const filmId of filmIds) {
      if (used.has(filmId)) continue;
      const optionsForFilm = byFilm.get(filmId) ?? [];
      for (const next of optionsForFilm) {
        const start = screeningStart(next);
        if (start <= lastEnd) continue;
        const gap = diffMinutes(start, lastEnd);
        if (gap > maxBreakMinutes) continue;
        advanced = true;
        extend([...path, next]);
      }
    }

    if (!advanced && path.length > 1) {
      if (mustSet.size === 0 || [...mustSet].every((id) => used.has(id))) {
        results.push(path);
      }
    }
  }

  for (const filmId of filmIds) {
    for (const start of byFilm.get(filmId) ?? []) {
      extend([start]);
    }
  }

  // Prefer longer plans; dedupe by screening id sequence
  const seen = new Set<string>();
  const unique: Screening[][] = [];
  const sortedPaths = results.sort((a, b) => b.length - a.length);
  for (const path of sortedPaths) {
    const key = path.map((p) => p.id).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(path);
  }

  const plans = unique.map((path) => summarizePlan(path, films, trailerMinutes));
  return sortPlans(plans, sort).slice(0, limit);
}

export function sortPlans(plans: GeneratedPlan[], sort: ItinerarySort): GeneratedPlan[] {
  const copy = [...plans];
  copy.sort((a, b) => {
    // Prefer more films first
    if (b.screenings.length !== a.screenings.length) {
      return b.screenings.length - a.screenings.length;
    }
    switch (sort) {
      case "earliest-finish":
        return a.finishAt.getTime() - b.finishAt.getTime();
      case "shortest-span":
        return a.spanMinutes - b.spanMinutes;
      case "fewest-wait":
      default:
        return a.totalWaitMinutes - b.totalWaitMinutes;
    }
  });
  return copy;
}

export function planToPlainText(
  plan: GeneratedPlan,
  cinemaName: string,
  date: string,
  bufferMinutes: number
): string {
  const lines: string[] = [
    `screenplan — ${cinemaName} · ${date}`,
    ""
  ];
  for (const seg of plan.segments) {
    if (seg.kind === "screening" && seg.screening) {
      const start = seg.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const end = seg.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      lines.push(`${start}–${end}  ${seg.filmName}`);
      if (seg.screening.bookingLink) {
        lines.push(`  Book: ${seg.screening.bookingLink}`);
      }
    } else if (seg.kind === "break") {
      const tip =
        bufferMinutes > 0
          ? ` (${bufferMinutes} min buffer tip)`
          : "";
      lines.push(`  ↳ ${seg.minutes} min break${seg.tight ? " ⚠ tight" : ""}${tip}`);
    } else if (seg.kind === "overlap") {
      lines.push(`  ↳ ${seg.minutes} min OVERLAP`);
    }
  }
  lines.push("");
  lines.push(
    `Span ${plan.spanMinutes} min · wait ${plan.totalWaitMinutes} min · finishes ${plan.finishAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  );
  return lines.join("\n");
}
