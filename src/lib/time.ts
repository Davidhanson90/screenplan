const MS_PER_MINUTE = 60_000;

export function parseIso(value: string): Date {
  return new Date(value);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_PER_MINUTE);
}

export function diffMinutes(later: Date, earlier: Date): number {
  return Math.trunc((later.getTime() - earlier.getTime()) / MS_PER_MINUTE);
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

export function todayIso(timeZone = "Europe/London"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function nextDays(count: number, fromIso?: string, timeZone = "Europe/London"): string[] {
  const start = fromIso ?? todayIso(timeZone);
  const base = new Date(`${start}T12:00:00Z`);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base.getTime());
    d.setUTCDate(base.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
