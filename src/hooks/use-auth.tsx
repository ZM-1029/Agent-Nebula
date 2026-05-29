import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
}

const DEMO_ACCOUNTS = [
  { email: "admin@frankie.demo", password: "Frankie-Admin-2026!", role: "admin" as AppRole, displayName: "John Doe" },
  { email: "agent@frankie.demo", password: "Frankie-Agent-2026!", role: "agent" as AppRole, displayName: "Alex Agent" },
];

const AUTH_KEY = "frankie_session";
const USERS_KEY = "frankie_users";

function getAllUsers() {
  const base = [...DEMO_ACCOUNTS];
  try {
    const extra: typeof DEMO_ACCOUNTS = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return [...base, ...extra];
  } catch {
    return base;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { user: LocalUser; role: AppRole };
        setUser(parsed.user);
        setRole(parsed.role);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const signInWithPassword: AuthContextValue["signInWithPassword"] = async (email, password) => {
    const found = getAllUsers().find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
    );
    if (!found) return { error: new Error("Invalid login credentials") };
    const u: LocalUser = { id: found.email, email: found.email, displayName: found.displayName };
    setUser(u);
    setRole(found.role);
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, role: found.role }));
    return { error: null };
  };

  const signUpWithPassword: AuthContextValue["signUpWithPassword"] = async (
    email,
    password,
    chosenRole,
    displayName,
  ) => {
    const existing = getAllUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return { error: new Error("User already registered") };
    const customUsers: typeof DEMO_ACCOUNTS = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    customUsers.push({
      email,
      password,
      role: chosenRole,
      displayName: displayName || email.split("@")[0],
    });
    localStorage.setItem(USERS_KEY, JSON.stringify(customUsers));
    return { error: null };
  };

  const signInWithGoogle: AuthContextValue["signInWithGoogle"] = async (_chosenRole) => {
    return { error: new Error("Google sign-in is not available in local mode.") };
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem(AUTH_KEY);
  };

  const session = user ? { user } : null;

  return (
    <AuthContext.Provider
      value={{ user, session, role, loading, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut }}
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
