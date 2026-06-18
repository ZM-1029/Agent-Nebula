/**
 * Shared authenticated fetch helper.
 * All live-chat service modules import from here so the JWT key is in one place.
 */

export const API_BASE = "https://chatbot-dev-htffd3h9cabqbbb7.canadacentral-01.azurewebsites.net";

export const JWT_KEY = "frankie_jwt";
export const REFRESH_KEY = "frankie_refresh_token";

export function getJwt(): string {
  return localStorage.getItem(JWT_KEY) ?? "";
}

// ── Agent analytics types ──────────────────────────────────────────────────

export interface AgentStat {
  id: string;
  name: string;
  status: string;
  sessionsHandled: number;
  sessionsResolved: number;
  resolutionRate: number;
  avgCsat: number;
  avgFirstReplySecs: number;
  ticketsAssigned: number;
}

export interface VolumePoint {
  date: string;
  label: string;
  total: number;
  resolved: number;
}

export async function authFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getJwt()}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  // 204 No Content — return undefined cast to T
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
