import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_BASE, JWT_KEY, REFRESH_KEY } from "@/services/authFetch";

export type AppRole = "admin" | "agent";

export interface LocalUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextValue {
  user: LocalUser | null;
  session: { user: LocalUser } | null;
  role: AppRole | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    role: AppRole,
    displayName?: string,
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: (role: AppRole) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** Merge updated fields into the current user (e.g. after a profile save). */
  updateUser: (patch: Partial<LocalUser>) => void;
}

// Fallback demo accounts — used when the backend is unreachable
const DEMO_ACCOUNTS = [
  {
    email: "admin@frankie.demo",
    password: "Frankie-Admin-2026!",
    role: "admin" as AppRole,
    displayName: "John Doe",
  },
  {
    email: "agent@frankie.demo",
    password: "Frankie-Agent-2026!",
    role: "agent" as AppRole,
    displayName: "Alex Agent",
  },
];

const AUTH_KEY = "frankie_session";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const stored = localStorage.getItem(AUTH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { user: LocalUser; role: AppRole };
          setUser(parsed.user);
          setRole(parsed.role);
          // Silently refresh JWT in the background
          const rt = localStorage.getItem(REFRESH_KEY);
          if (rt) {
            try {
              const res = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken: rt }),
              });
              if (res.ok) {
                const data = await res.json();
                localStorage.setItem(JWT_KEY, data.token as string);
              }
            } catch {
              /* ignore — demo mode or network down */
            }
          }
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    restore();
  }, []);

  const signInWithPassword: AuthContextValue["signInWithPassword"] = async (email, password) => {
    // ── Try real backend ──────────────────────────────────────────────────
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const bu = data.user as { id: string; name: string; email: string; role: string };
        const mappedRole: AppRole = bu.role.toLowerCase() === "admin" ? "admin" : "agent";
        const u: LocalUser = { id: String(bu.id), email: bu.email, displayName: bu.name };
        setUser(u);
        setRole(mappedRole);
        localStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, role: mappedRole }));
        localStorage.setItem(JWT_KEY, data.token as string);
        if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken as string);
        return { error: null };
      }
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      return { error: new Error(errData.error ?? "Invalid login credentials") };
    } catch {
      // ── Backend unreachable — fall back to demo accounts ────────────────
      const found = DEMO_ACCOUNTS.find(
        (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password,
      );
      if (!found) return { error: new Error("Invalid login credentials") };
      const u: LocalUser = { id: found.email, email: found.email, displayName: found.displayName };
      setUser(u);
      setRole(found.role);
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, role: found.role }));
      return { error: null };
    }
  };

  // New accounts are created by an Admin via /api/agents — no self-registration.
  const signUpWithPassword: AuthContextValue["signUpWithPassword"] = async () => {
    return {
      error: new Error(
        "New accounts are created by an Administrator via the agent management panel.",
      ),
    };
  };

  const signInWithGoogle: AuthContextValue["signInWithGoogle"] = async () => {
    return { error: new Error("Google sign-in is not available.") };
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(REFRESH_KEY);
  };

  const updateUser: AuthContextValue["updateUser"] = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user: next, role }));
      return next;
    });
  };

  const session = user ? { user } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        signOut,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
