import { authFetch } from "./authFetch";

export interface WorkspaceSettings {
  autoAssignEnabled: boolean;
  maxConcurrentChats: number;
  responseTimeoutSeconds: number;
  maxAssignAttempts: number;
}

export const settingsService = {
  get: () => authFetch<WorkspaceSettings>("/api/settings"),

  update: (body: Partial<WorkspaceSettings>) =>
    authFetch<WorkspaceSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
