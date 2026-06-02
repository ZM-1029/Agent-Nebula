import { authFetch } from "./authFetch";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  customerName: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  tags: string[];
  /** Computed: slaDeadline < now && status !== "Resolved" */
  slaBreach: boolean;
  assignedAgent: { id: string; name: string } | null;
}

export interface TicketNote {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface TicketDetail extends Ticket {
  messages: {
    senderType: string;
    senderName: string;
    content: string;
    timestamp: string;
  }[];
  notes: TicketNote[];
}

export interface UpdateTicketBody {
  status?: string;
  priority?: string;
  assignedAgentId?: string;
  tags?: string[];
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  agentId?: string;
  search?: string;
}

// ── Service ────────────────────────────────────────────────────────────────

export const ticketsService = {
  /** List tickets with optional filters */
  getAll: (filters?: TicketFilters) => {
    const q = new URLSearchParams();
    if (filters?.status)   q.set("status",   filters.status);
    if (filters?.priority) q.set("priority", filters.priority);
    if (filters?.agentId)  q.set("agentId",  filters.agentId);
    if (filters?.search)   q.set("search",   filters.search);
    const qs = q.toString();
    return authFetch<Ticket[]>(`/api/tickets${qs ? `?${qs}` : ""}`);
  },

  /** Get full ticket detail including chat transcript */
  getById: (id: string) => authFetch<TicketDetail>(`/api/tickets/${id}`),

  /** Update ticket fields */
  update: (id: string, body: UpdateTicketBody) =>
    authFetch<Pick<Ticket, "id" | "status" | "priority" | "updatedAt">>(
      `/api/tickets/${id}`,
      { method: "PUT", body: JSON.stringify(body) },
    ),

  /** Add an internal note to a ticket */
  addNote: (id: string, content: string) =>
    authFetch<TicketNote>(`/api/tickets/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
