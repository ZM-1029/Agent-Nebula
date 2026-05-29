import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

export function RequireAuth({ children, role }: { children: ReactNode; role?: "admin" | "agent" }) {
  const { user, role: userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
    } else if (role && userRole && userRole !== role) {
      navigate({ to: userRole === "admin" ? "/admin" : "/live-chats", replace: true });
    }
  }, [user, userRole, loading, role, navigate]);

  if (loading || !user) return null;
  if (role && userRole && userRole !== role) return null;
  return <>{children}</>;
}
