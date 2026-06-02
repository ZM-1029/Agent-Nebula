import { authFetch } from "./authFetch";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  /** NewChat | SLABreach | AgentOffline | SessionResolved | ChatTransferred */
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ── Service ────────────────────────────────────────────────────────────────

export const notificationsService = {
  /** Fetch all notifications for the calling agent/admin */
  getAll: () => authFetch<AppNotification[]>("/api/notifications"),

  /** Mark a single notification as read */
  markRead: (id: string) =>
    authFetch<void>(`/api/notifications/${id}/read`, { method: "PUT" }),

  /** Mark all notifications as read for the current user */
  markAllRead: () =>
    authFetch<void>("/api/notifications/read-all", { method: "PUT" }),
};
