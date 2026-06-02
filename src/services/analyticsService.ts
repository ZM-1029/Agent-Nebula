import { authFetch } from "./authFetch";

// ── Types ──────────────────────────────────────────────────────────────────

/** One day of conversation volume — matches the admin dashboard area chart. */
export interface VolumePoint {
  day: string; // "dd MMM"
  sessions: number;
  resolved: number;
}

/** Average pickup seconds for a single hour of today. */
export interface ResponseHourPoint {
  hour: string; // "00".."23"
  avg: number; // seconds
}

/** One day of session timing metrics (all values in seconds). */
export interface SessionMetricDay {
  date: string; // "d MMM"
  pickup: number;
  response: number;
  firstResponse: number;
}

export interface SessionMetrics {
  avgPickup: string; // "HH:MM:SS"
  avgResponse: string;
  avgFirstResponse: string;
  series: SessionMetricDay[];
}

// ── Service ────────────────────────────────────────────────────────────────

export const analyticsService = {
  /** Per-day session vs. resolved volume (Admin). */
  getVolume: (days = 7) => authFetch<VolumePoint[]>(`/api/analytics/volume?days=${days}`),

  /** Average pickup time by hour for today (Admin). */
  getResponseByHour: () => authFetch<ResponseHourPoint[]>("/api/analytics/response-by-hour"),

  /**
   * Pickup / first-response / response metrics.
   * scope "me" → calling agent's sessions; "all" → workspace-wide (Admin).
   */
  getSessionMetrics: (days = 30, scope: "me" | "all" = "me") =>
    authFetch<SessionMetrics>(`/api/analytics/session-metrics?days=${days}&scope=${scope}`),
};
