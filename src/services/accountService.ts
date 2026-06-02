import { API_BASE, JWT_KEY, getJwt } from "./authFetch";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
}

export interface UpdateProfileBody {
  name: string;
  email: string;
  phone?: string | null;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

// ── Helper: POST/PUT that surfaces the server's error message ───────────────

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getJwt()}`,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

// ── Service ────────────────────────────────────────────────────────────────

export const accountService = {
  /** Fetch the currently-authenticated user's profile. */
  getMe: () => send<AccountUser>("/api/auth/me", "GET"),

  /**
   * Update the caller's own profile. The backend returns a fresh JWT (the
   * name/email claims change), which we persist so subsequent requests carry
   * the updated identity.
   */
  updateProfile: async (body: UpdateProfileBody) => {
    const data = await send<{ token: string; user: AccountUser }>("/api/auth/me", "PUT", body);
    if (data.token) localStorage.setItem(JWT_KEY, data.token);
    return data.user;
  },

  /** Change the caller's password (verifies the current password server-side). */
  changePassword: (body: ChangePasswordBody) =>
    send<{ success: boolean }>("/api/auth/change-password", "POST", body),
};
