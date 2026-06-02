import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/admin/stat-card";
import { GlassCard } from "@/components/admin/glass-card";
import { Users, Ticket, MessagesSquare, Users2, Zap, ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { agentsService } from "@/services/agentsService";
import { ticketsService } from "@/services/ticketsService";
import { liveChatService } from "@/services/liveChatService";
import { analyticsService } from "@/services/analyticsService";
import { notificationsService } from "@/services/notificationsService";
import { formatDistanceToNow } from "date-fns";

function friendlyTitle(type: string): string {
  const map: Record<string, string> = {
    NewChat: "New chat",
    ChatTransferred: "Chat transferred",
    AgentOffline: "Agent offline",
    AgentOnline: "Agent online",
    SLABreach: "SLA breach",
    SessionResolved: "Session resolved",
  };
  return map[type] ?? type.replace(/([A-Z])/g, " $1").trim();
}

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Helix Support" },
      {
        name: "description",
        content: "Realtime overview of live chats, tickets, agents and AI-assisted support.",
      },
    ],
  }),
  component: Dashboard,
});

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-xs">
      <p className="font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.dataKey}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsService.getAll(),
    retry: 1,
    refetchInterval: 30_000,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => ticketsService.getAll(),
    retry: 1,
    refetchInterval: 60_000,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () => liveChatService.getActiveSessions(),
    retry: 1,
    refetchInterval: 15_000,
  });

  const { data: queue = [] } = useQuery({
    queryKey: ["admin-queue"],
    queryFn: () => liveChatService.getQueue(),
    retry: 1,
    refetchInterval: 15_000,
  });

  const { data: volume = [] } = useQuery({
    queryKey: ["analytics-volume", 7],
    queryFn: () => analyticsService.getVolume(7),
    retry: 1,
    refetchInterval: 60_000,
  });

  const { data: responseByHour = [] } = useQuery({
    queryKey: ["analytics-response-by-hour"],
    queryFn: () => analyticsService.getResponseByHour(),
    retry: 1,
    refetchInterval: 60_000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsService.getAll,
    retry: 1,
    refetchInterval: 30_000,
  });

  const onlineAgents = agents.filter((a) => a.status.toLowerCase() === "online").length;
  const openTickets = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status.toLowerCase()),
  ).length;
  const liveChats = sessions.length;
  const waitingInQueue = queue.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Live overview
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Good afternoon, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening across your support desk right now.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="font-medium">{liveChats} live chats</span>
          <span className="text-muted-foreground">· {waitingInQueue} in queue</span>
          <span className="text-muted-foreground">· {onlineAgents} agents online</span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Online agents"
          value={onlineAgents}
          delta={0}
          icon={Users}
          tone="primary"
        />
        <StatCard label="Open tickets" value={openTickets} delta={0} icon={Ticket} tone="blue" />
        <StatCard
          label="Live chats"
          value={liveChats}
          delta={0}
          icon={MessagesSquare}
          tone="amber"
        />
        <StatCard
          label="Waiting in queue"
          value={waitingInQueue}
          delta={0}
          icon={Users2}
          tone="violet"
        />
      </div>

      {/* Conversation volume chart */}
      <GlassCard className="overflow-hidden">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold">Conversation volume</p>
            <p className="text-xs text-muted-foreground">Last 7 days, sessions vs. resolved</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
            {["7d", "30d", "90d"].map((p, i) => (
              <button
                key={p}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition",
                  i === 0 ? "bg-background shadow-soft" : "text-muted-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={volume} margin={{ left: -10, right: 4, top: 4 }}>
            <defs>
              <linearGradient id="gSess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="sessions"
              stroke="var(--primary)"
              strokeWidth={2.5}
              fill="url(#gSess)"
            />
            <Area
              type="monotone"
              dataKey="resolved"
              stroke="var(--accent-blue)"
              strokeWidth={2.5}
              fill="url(#gRes)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
        {/* Response time bars */}
        <GlassCard>
          <p className="text-sm font-semibold">Response time</p>
          <p className="text-xs text-muted-foreground">Avg seconds by hour today</p>
          <ResponsiveContainer width="100%" height={180} className="mt-3">
            <BarChart data={responseByHour} margin={{ left: -20, right: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]} fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Activity timeline */}
        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Activity</p>
            <Zap className="h-4 w-4 text-primary" />
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground">No recent activity</p>
          ) : (
            <ol className="relative space-y-3 border-l border-border/60 pl-4">
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <p className="text-xs">
                    <span className="font-medium">{friendlyTitle(n.type)}</span> — {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </GlassCard>

        {/* Recent conversations — live from API */}
        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Recent conversations</p>
            <a href="/admin/chats" className="text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight className="inline h-3 w-3" />
            </a>
          </div>
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active sessions</p>
            ) : (
              sessions.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-accent/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                    {s.customerName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{s.customerName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {s.agentName ? `With ${s.agentName}` : "Unassigned"} · {s.reference}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize",
                      s.status.toLowerCase() === "active"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {s.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
