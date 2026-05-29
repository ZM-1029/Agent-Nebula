import { Link, useRouterState } from "@tanstack/react-router";
import {
  MessagesSquare, Inbox, BarChart3, Settings, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const workspace = [
  { to: "/live-chats", label: "Live Chats", icon: MessagesSquare, badge: "12" },
  { to: "/ticket-queue", label: "Session queue", icon: Inbox, badge: "8" },
  { to: "/performance", label: "Performance", icon: BarChart3 },
];

const bottom = [
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ variant = "desktop", onNavigate }: { variant?: "desktop" | "mobile"; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact?: boolean) =>
    exact ? path === to : path === to || path.startsWith(to + "/");

  const inner = (
    <>
      <div className="flex items-center gap-3 px-2 pb-4">
        <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#57b85c] to-[#3d9e42] text-white shadow-[0_8px_24px_-6px_rgba(87,184,92,0.6)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Frankie</div>
          <div className="text-[11px] text-muted-foreground">Support Agent</div>
        </div>
      </div>

      <SectionLabel>Workspace</SectionLabel>
      <nav className="flex flex-col gap-1">
        {workspace.map((it) => (
          <NavItem key={it.to} {...it} active={isActive(it.to)} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border/60 pt-2">
        {bottom.map((it) => (
          <NavItem key={it.to} {...it} active={isActive(it.to)} onNavigate={onNavigate} />
        ))}
      </div>
    </>
  );

  if (variant === "mobile") {
    return <div className="flex h-full w-full flex-col p-4">{inner}</div>;
  }

  return (
    <aside className="glass sticky top-4 m-4 mr-0 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col self-start rounded-3xl p-4 md:flex">
      {inner}
    </aside>
  );
}


function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80", className)}>
      {children}
    </div>
  );
}

function NavItem({
  to, label, icon: Icon, badge, dot, active, onNavigate,
}: { to: string; label: string; icon: any; badge?: string; dot?: boolean; active?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-gradient-to-r from-brand to-[oklch(0.78_0.16_155)] text-white shadow-[0_8px_24px_-10px_rgba(87,184,92,0.8)]"
          : "text-foreground/75 hover:bg-white/60 hover:text-foreground",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", active ? "text-white" : "text-foreground/60")} />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
          active ? "bg-white/25 text-white" : "bg-foreground/5 text-foreground/70",
        )}>
          {badge}
        </span>
      )}
      {dot && <span className="h-2 w-2 rounded-full bg-sky shadow-[0_0_8px_rgba(75,163,227,0.9)]" />}
    </Link>
  );
}
