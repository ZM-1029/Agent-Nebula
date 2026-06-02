import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GlassCard } from "@/components/admin/glass-card";
import { Button } from "@/components/ui/button";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Download, FileText, Calendar, Users, CheckCircle2,
  XCircle, PackageSearch, FileQuestion, TrendingUp,
  MessageSquare, Ticket, Star,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { authFetch, type AgentStat, type VolumePoint } from "@/services/authFetch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Frankie" },
      { name: "description", content: "Agent performance and customer interaction analytics." },
    ],
  }),
  component: AnalyticsPage,
});

const AUTO = "auto";

// ── helpers ────────────────────────────────────────────────────────────────

function fmtReply(secs: number) {
  if (secs === 0) return "—";
  if (secs < 60) return `${secs}s`;
  return `${Math.round(secs / 60)}m`;
}

function csatColor(v: number) {
  if (v >= 80) return "text-primary";
  if (v >= 60) return "text-accent-amber";
  return "text-destructive";
}

// ── main component ──────────────────────────────────────────────────────────

function AnalyticsPage() {
  const [tab, setTab] = useState<"agents" | "chatbot">("agents");
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(AUTO);

  // ── Agent analytics data ─────────────────────────────────────────────────
  const { data: agentStats = [] } = useQuery<AgentStat[]>({
    queryKey: ["analytics-agents"],
    queryFn: () => authFetch<AgentStat[]>("/api/analytics/agents"),
    retry: 1,
    refetchInterval: 60_000,
  });

  const { data: volumeRaw = [] } = useQuery<VolumePoint[]>({
    queryKey: ["analytics-volume"],
    queryFn: () => authFetch<VolumePoint[]>("/api/analytics/volume?days=7"),
    retry: 1,
  });

  // ── Chatbot analytics data ───────────────────────────────────────────────
  const { data: availableDates = [] } = useQuery({
    queryKey: ["available-dates"],
    queryFn: () => api.getAvailableDates(),
    retry: 1,
    enabled: tab === "chatbot",
  });

  const activeDate = selectedDate === AUTO ? (availableDates[0] ?? today) : selectedDate;

  const { data: history = [] } = useQuery({
    queryKey: ["analytics-history"],
    queryFn: () => api.getHistory(14),
    retry: 1,
    enabled: tab === "chatbot",
  });

  const { data: hourly = [] } = useQuery({
    queryKey: ["analytics-hourly", activeDate],
    queryFn: () => api.getHourly(activeDate),
    retry: 1,
    enabled: tab === "chatbot" && !!activeDate,
  });

  const { data: stats } = useQuery({
    queryKey: ["analytics-stats", activeDate],
    queryFn: () => api.getStats(activeDate),
    retry: 1,
    enabled: tab === "chatbot" && !!activeDate,
  });

  // ── derived ──────────────────────────────────────────────────────────────

  const totalHandled   = agentStats.reduce((s, a) => s + a.sessionsHandled, 0);
  const totalResolved  = agentStats.reduce((s, a) => s + a.sessionsResolved, 0);
  const avgResolution  = agentStats.length
    ? Math.round(agentStats.reduce((s, a) => s + a.resolutionRate, 0) / agentStats.length)
    : 0;
  const avgCsat = agentStats.filter((a) => a.avgCsat > 0).length
    ? Math.round(
        agentStats.filter((a) => a.avgCsat > 0).reduce((s, a) => s + a.avgCsat, 0) /
        agentStats.filter((a) => a.avgCsat > 0).length,
      )
    : 0;

  const barData = agentStats.map((a) => ({
    name: a.name.split(" ")[0],
    Handled: a.sessionsHandled,
    "Resolution %": a.resolutionRate,
  }));

  const volumeData = volumeRaw.map((v) => ({
    day: v.label,
    Sessions: v.total,
    Resolved: v.resolved,
  }));

  // ── chatbot export ───────────────────────────────────────────────────────

  function exportCSV() {
    if (tab === "agents") {
      const headers = ["Agent", "Handled", "Resolved", "Resolution %", "Avg CSAT", "Avg First Reply", "Tickets"];
      const rows = agentStats.map((a) => [
        a.name, a.sessionsHandled, a.sessionsResolved,
        a.resolutionRate + "%", a.avgCsat + "%",
        fmtReply(a.avgFirstReplySecs), a.ticketsAssigned,
      ]);
      const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "agent-analytics.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } else {
      const headers = ["Date", "Interactions", "Orders Tracked", "Confirmed", "Declined", "OTP Sent", "Success Rate"];
      const rows = history.map((d) => [d.date, d.totalRequests, d.trackLookups, d.confirmations, d.declines, d.otpSent, d.successRate + "%"]);
      const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `analytics-${activeDate}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    }
  }

  // ── chatbot-derived ───────────────────────────────────────────────────────

  const trendData = history.map((d) => ({
    day: d.label, Interactions: d.totalRequests, Confirmed: d.confirmations, Declined: d.declines,
  }));
  const hourlyActivity = hourly
    .filter((h) => h.requests > 0)
    .map((h) => ({ hour: h.label.replace(":00", ""), interactions: h.requests, tracked: h.tracks }));
  const totalInteractions  = stats?.totalRequests ?? 0;
  const ordersFound        = stats?.ordersFound ?? 0;
  const foundRate          = stats?.trackLookups ? Math.round((ordersFound / stats.trackLookups) * 100) : 0;
  const confirmed          = stats?.confirmations ?? 0;
  const declined           = stats?.declines ?? 0;
  const descriptionRequests = stats?.instructions ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance trends across your workspace.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab === "chatbot" && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-1.5 text-sm shadow-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm outline-none"
              >
                <option value={AUTO} className="bg-popover text-popover-foreground">
                  Most recent ({availableDates[0] ?? today})
                </option>
                {availableDates.map((d) => (
                  <option key={d} value={d} className="bg-popover text-popover-foreground">
                    {d}{d === today ? " (today)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-fit">
        {(["agents", "chatbot"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition",
              tab === t
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "agents" ? "Agent Performance" : "Chatbot Analytics"}
          </button>
        ))}
      </div>

      {/* ── AGENT ANALYTICS TAB ─────────────────────────────────────────── */}
      {tab === "agents" && (
        <>
          {/* KPI row */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Active Agents</p>
                <p className="text-2xl font-semibold">{agentStats.length}</p>
                <p className="text-[11px] text-muted-foreground">
                  {agentStats.filter((a) => a.status.toLowerCase() === "online").length} online
                </p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Sessions Handled</p>
                <p className="text-2xl font-semibold">{totalHandled.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{totalResolved} resolved</p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Avg Resolution</p>
                <p className="text-2xl font-semibold">{avgResolution}%</p>
                <p className="text-[11px] text-muted-foreground">across all agents</p>
              </div>
            </GlassCard>

            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Avg CSAT</p>
                <p className="text-2xl font-semibold">{avgCsat > 0 ? `${avgCsat}%` : "—"}</p>
                <p className="text-[11px] text-muted-foreground">customer satisfaction</p>
              </div>
            </GlassCard>
          </div>

          {/* Charts row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Agent performance bar chart */}
            <GlassCard>
              <p className="text-sm font-semibold">Agent performance</p>
              <p className="text-[11px] text-muted-foreground">Sessions handled vs resolution %</p>
              {agentStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={220} className="mt-2">
                  <BarChart data={barData} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
                    />
                    <Bar dataKey="Handled" radius={[6, 6, 0, 0]} fill="var(--primary)" />
                    <Bar dataKey="Resolution %" radius={[6, 6, 0, 0]} fill="var(--accent-rose, #a855f7)" opacity={0.75} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                  No session data yet.
                </div>
              )}
            </GlassCard>

            {/* Session volume area chart */}
            <GlassCard>
              <p className="text-sm font-semibold">Session metrics</p>
              <p className="text-[11px] text-muted-foreground">Daily sessions vs resolved (7 days)</p>
              {volumeData.some((v) => v.Sessions > 0) ? (
                <ResponsiveContainer width="100%" height={220} className="mt-2">
                  <AreaChart data={volumeData} margin={{ left: -20 }}>
                    <defs>
                      <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    <Area dataKey="Sessions" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gSessions)" />
                    <Area dataKey="Resolved" stroke="var(--accent-blue)" strokeWidth={2} fill="url(#gResolved)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                  No session data yet.
                </div>
              )}
            </GlassCard>
          </div>

          {/* Agent performance table */}
          <GlassCard className="p-0">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-sm font-semibold">Agent performance</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="p-3 font-medium">Agent</th>
                    <th className="p-3 font-medium text-right">Handled</th>
                    <th className="p-3 font-medium text-right">Resolved</th>
                    <th className="p-3 font-medium text-right">Resolution</th>
                    <th className="p-3 font-medium text-right">Avg First Reply</th>
                    <th className="p-3 font-medium text-right">Tickets</th>
                    <th className="p-3 font-medium text-right">CSAT</th>
                  </tr>
                </thead>
                <tbody>
                  {agentStats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        No data yet — sessions will appear here once agents handle chats.
                      </td>
                    </tr>
                  ) : (
                    agentStats
                      .slice()
                      .sort((a, b) => b.sessionsHandled - a.sessionsHandled)
                      .map((a) => (
                        <tr key={a.id} className="border-b border-border/40 transition hover:bg-accent/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-xs">{a.name}</p>
                                <span className={cn(
                                  "text-[10px] font-medium capitalize",
                                  a.status.toLowerCase() === "online" ? "text-primary" : "text-muted-foreground",
                                )}>
                                  {a.status}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold text-xs">
                            {a.sessionsHandled === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              a.sessionsHandled
                            )}
                          </td>
                          <td className="p-3 text-right text-xs">{a.sessionsResolved || "—"}</td>
                          <td className="p-3 text-right text-xs">
                            {a.sessionsHandled > 0 ? (
                              <span className={cn("font-semibold", a.resolutionRate >= 80 ? "text-primary" : a.resolutionRate >= 60 ? "text-accent-amber" : "text-destructive")}>
                                {a.resolutionRate}%
                              </span>
                            ) : "—"}
                          </td>
                          <td className="p-3 text-right text-xs text-muted-foreground">
                            {fmtReply(a.avgFirstReplySecs)}
                          </td>
                          <td className="p-3 text-right text-xs">{a.ticketsAssigned || "—"}</td>
                          <td className="p-3 text-right text-xs">
                            {a.avgCsat > 0 ? (
                              <span className={cn("font-semibold", csatColor(a.avgCsat))}>
                                {a.avgCsat}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {/* ── CHATBOT ANALYTICS TAB ───────────────────────────────────────── */}
      {tab === "chatbot" && (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total Interactions</p>
                <p className="text-2xl font-semibold tracking-tight">{totalInteractions.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{activeDate}</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <PackageSearch className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Order Found Rate</p>
                <p className="text-2xl font-semibold tracking-tight">{foundRate}%</p>
                <p className="text-[11px] text-muted-foreground">{ordersFound} of {stats?.trackLookups ?? 0} tracked</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Deliveries Confirmed</p>
                <p className="text-2xl font-semibold tracking-tight">{confirmed.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Accepted by customer</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Deliveries Declined</p>
                <p className="text-2xl font-semibold tracking-tight">{declined.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Refused by customer</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                <FileQuestion className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Instruction Requests</p>
                <p className="text-2xl font-semibold tracking-tight">{descriptionRequests.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">Delivery instructions asked</p>
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassCard>
              <p className="text-sm font-semibold">Customer engagement</p>
              <p className="text-[11px] text-muted-foreground">Daily interactions, confirmed and declined deliveries (14 days)</p>
              <ResponsiveContainer width="100%" height={220} className="mt-2">
                <AreaChart data={trendData} margin={{ left: -20 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Area dataKey="Interactions" stroke="var(--primary)" strokeWidth={2.5} fill="url(#g1)" />
                  <Area dataKey="Confirmed" stroke="var(--accent-blue)" strokeWidth={2} fill="url(#g2)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            <GlassCard>
              <p className="text-sm font-semibold">Peak interaction hours</p>
              <p className="text-[11px] text-muted-foreground">When customers are most active — {activeDate}</p>
              {hourlyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={220} className="mt-2">
                  <BarChart data={hourlyActivity} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    <Bar dataKey="interactions" name="Interactions" radius={[6, 6, 0, 0]} fill="var(--primary)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                  No data for {activeDate}
                </div>
              )}
            </GlassCard>
          </div>

          {history.length > 0 && (
            <GlassCard>
              <p className="text-sm font-semibold">Daily activity summary</p>
              <p className="text-[11px] text-muted-foreground mb-3">Last 14 days — interactions, order lookups and delivery outcomes</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-[11px] uppercase text-muted-foreground">
                      <th className="p-2 font-medium">Date</th>
                      <th className="p-2 font-medium text-right">Interactions</th>
                      <th className="p-2 font-medium text-right">Orders Tracked</th>
                      <th className="p-2 font-medium text-right text-emerald-600">Confirmed</th>
                      <th className="p-2 font-medium text-right text-red-500">Declined</th>
                      <th className="p-2 font-medium text-right">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((d) => (
                      <tr key={d.date} className={cn("border-b border-border/40 hover:bg-accent/30 transition", d.date === activeDate && "bg-primary/5")}>
                        <td className="p-2 text-xs font-medium">
                          {d.label}
                          {d.date === activeDate && (
                            <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">selected</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-semibold">{d.totalRequests.toLocaleString()}</td>
                        <td className="p-2 text-right text-blue-500">{d.trackLookups.toLocaleString()}</td>
                        <td className="p-2 text-right text-emerald-600 dark:text-emerald-400 font-medium">{d.confirmations.toLocaleString()}</td>
                        <td className="p-2 text-right text-red-500 font-medium">{d.declines.toLocaleString()}</td>
                        <td className="p-2 text-right">
                          <span className={cn("font-semibold", d.successRate >= 90 ? "text-emerald-600 dark:text-emerald-400" : d.successRate >= 70 ? "text-amber-500" : "text-red-500")}>
                            {d.successRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
