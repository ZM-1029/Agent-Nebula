import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard, MessagesSquare, Users,
  BarChart3, Settings, ChevronLeft, Headphones, ClipboardList, Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { liveChatService } from "@/services/liveChatService";
import { agentsService } from "@/services/agentsService";
import { ticketsService } from "@/services/ticketsService";

const navItems = [
  { to: "/admin",           label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { to: "/admin/chats",     label: "Live Chats", icon: MessagesSquare,  countKey: "live" },
  { to: "/admin/agents",    label: "Agents",     icon: Users,           countKey: "agents" },
  { to: "/admin/tickets",   label: "Tickets",    icon: Ticket,          countKey: "tickets" },
  { to: "/admin/analytics", label: "Analytics",  icon: BarChart3 },
  { to: "/admin/records",   label: "Records",    icon: ClipboardList },
];

const bottom = [
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function AppSidebar({ collapsed, onToggle, variant = "desktop", onNavigate }: AppSidebarProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMobile = variant === "mobile";
  const showLabel = isMobile || !collapsed;

  const { data: activeSessions = [] } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () => liveChatService.getActiveSessions(),
    refetchInterval: 15_000,
    retry: 1,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsService.getAll(),
    refetchInterval: 30_000,
    retry: 1,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => ticketsService.getAll(),
    refetchInterval: 30_000,
    retry: 1,
  });

  const counts: Record<string, number> = {
    live:    activeSessions.length,
    agents:  agents.filter((a) => a.status.toLowerCase() === "online").length,
    tickets: tickets.filter((t) => t.status.toLowerCase() === "open").length,
  };

  const content = (
    <>
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-primary text-primary-foreground shadow-soft">
          <Headphones className="h-5 w-5" />
        </div>
        {showLabel && (
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-semibold tracking-tight text-lg">Frankie</p>
            <p className="truncate text-[11px] text-muted-foreground">Live admin console</p>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
          const count = item.countKey ? counts[item.countKey] : 0;
          const badge = count > 0 ? String(count) : undefined;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={!showLabel ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                !showLabel && "justify-center px-2",
                active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {active && !isMobile && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-0 rounded-xl bg-primary/12"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <item.icon className="relative z-10 h-[18px] w-[18px] shrink-0" />
              {showLabel && (
                <>
                  <span className="relative z-10 flex-1 truncate">{item.label}</span>
                  {badge && (
                    <span className="relative z-10 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-border/60 pt-2">
        {bottom.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={!showLabel ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                !showLabel && "justify-center px-2",
                active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {showLabel && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </>
  );

  if (isMobile) {
    return <aside className="flex h-full w-full flex-col p-3">{content}</aside>;
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 252 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      className="glass-strong fixed inset-y-3 left-3 z-30 hidden flex-col rounded-3xl p-3 md:flex"
    >
      {content}
    </motion.aside>
  );
}
