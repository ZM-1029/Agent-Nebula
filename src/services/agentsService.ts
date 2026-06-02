import { authFetch } from "./authFetch";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  /** Only present on getById — count of currently active sessions */
  activeChats?: number;
}

export interface CreateAgentBody {
  name: string;
  email: string;
  password: string;
  role?: string;
}

// ── Service ────────────────────────────────────────────────────────────────

export const agentsService = {
  /** Get all agents (any authenticated user) */
  getAll: () => authFetch<Agent[]>("/api/agents"),

  /** Get a single agent with activeChats count */
  getById: (id: string) => authFetch<Agent>(`/api/agents/${id}`),

  /** Update agent online status — valid values: Online | Busy | Away | Offline */
  updateStatus: (id: string, status: string) =>
    authFetch<{ status: string }>(`/api/agents/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  /** Admin only: create a new agent account */
  create: (body: CreateAgentBody) =>
    authFetch<Pick<Agent, "id" | "name" | "email" | "role">>("/api/agents", {
      method: "POST",
      body: JSON.stringify({ role: "Agent", ...body }),
    }),

  /** Admin only: permanently delete an agent */
  delete: (id: string) => authFetch<void>(`/api/agents/${id}`, { method: "DELETE" }),
};
