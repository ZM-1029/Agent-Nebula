// Helpers for client-side date-range filtering. The dashboard API only exposes
// single-date endpoints, so a range is built by enumerating the days and
// fanning out one request per day, then aggregating the results on the client.

/** Inclusive list of YYYY-MM-DD strings between two dates (UTC, DST-safe). */
export function datesInRange(from: string, to: string): string[] {
  if (!from || !to) return [];
  let start = from;
  let end = to;
  if (start > end) [start, end] = [end, start];
  const out: string[] = [];
  const d = new Date(start + "T00:00:00Z");
  const endD = new Date(end + "T00:00:00Z");
  let guard = 0;
  while (d <= endD && guard < 1000) {
    out.push(d.toISOString().split("T")[0]);
    d.setUTCDate(d.getUTCDate() + 1);
    guard++;
  }
  return out;
}

/** Whole days between two YYYY-MM-DD dates (absolute). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round(Math.abs(db - da) / 86_400_000);
}

/** Soft cap on how many days we'll fan out at once (one request per day). */
export const MAX_RANGE_DAYS = 60;
