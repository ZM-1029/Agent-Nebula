import { API_BASE, getJwt } from "./authFetch";

export interface CannedReply {
  id: string;
  text: string;
  sortOrder: number;
}

async function req<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getJwt()}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { error?: string }).error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  // DELETE returns an empty 200 body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const cannedRepliesService = {
  getAll: () => req<CannedReply[]>("/api/canned-replies", "GET"),
  create: (text: string) => req<CannedReply>("/api/canned-replies", "POST", { text }),
  update: (id: string, text: string) =>
    req<CannedReply>(`/api/canned-replies/${id}`, "PUT", { text }),
  remove: (id: string) => req<void>(`/api/canned-replies/${id}`, "DELETE"),
};
