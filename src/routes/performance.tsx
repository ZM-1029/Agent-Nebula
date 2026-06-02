import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analyticsService";
import { ticketsService } from "@/services/ticketsService";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance — Frankie" },
      {
        name: "description",
        content: "Agent scorecard: tickets, response times, channel mix, and happiness rating.",
      },
    ],
  }),
  component: Performance,
});

const CLOSED_STATUSES = ["resolved", "closed"];

function hmsToSeconds(hms?: string): number {
  if (!hms) return 0;
  const parts = hms.split(":").map(Number);
  const [h = 0, m = 0, s = 0] = parts;
  return h * 3600 + m * 60 + s;
}

/** Shared query — the calling agent's own tickets (deduped by React Query). */
function useAgentTickets(agentId: string) {
  return useQuery({
    queryKey: ["agent-tickets", agentId],
    queryFn: () => ticketsService.getAll({ agentId }),
    enabled: !!agentId,
    retry: 1,
    refetchInterval: 60_000,
  });
}

/** Shared query — the calling agent's session timing metrics (30 days). */
function useMyMetrics() {
  return useQuery({
    queryKey: ["session-metrics", 30],
    queryFn: () => analyticsService.getSessionMetrics(30, "me"),
    retry: 1,
    refetchInterval: 60_000,
  });
}

function Performance() {
  const { user } = useAuth();
  const agentId = user?.id ?? "";

  return (
    <AppShell>
      <div>
        <div className="min-w-0">
          <div className="mb-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Workspace
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
              Performance Dashboard
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your pickup speed, response times and ticket throughput over the last 30 days.
            </p>
          </div>

          {/* KPI strip */}
          <KpiStrip agentId={agentId} />

          {/* Mid row */}
          <div className="mt-5">
            <ResponseTimesCard />
          </div>

          {/* Session metrics */}
          <SessionMetricsCard />

          {/* Ticket volume */}
          <TicketVolumeCard agentId={agentId} />
        </div>
      </div>
    </AppShell>
  );
}

function KpiStrip({ agentId }: { agentId: string }) {
  const { data: tickets = [] } = useAgentTickets(agentId);
  const { data: metrics } = useMyMetrics();

  const closed = tickets.filter((t) => CLOSED_STATUSES.includes(t.status.toLowerCase()));
  const openCount = tickets.length - closed.length;

  // Avg resolution = mean(updatedAt − createdAt) across this agent's closed tickets.
  const avgResolution = closed.length
    ? fmtHMS(
        closed.reduce(
          (sum, t) =>
            sum +
            Math.max((new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()) / 1000, 0),
          0,
        ) / closed.length,
      )
    : "—";

  const cards = [
    { label: "Open Tickets", value: String(openCount) },
    { label: "Closed Tickets", value: String(closed.length) },
    { label: "Avg Response Time", value: metrics?.avgResponse ?? "—" },
    { label: "Avg Resolution Time", value: avgResolution },
    { label: "Avg Pickup Time", value: metrics?.avgPickup ?? "—" },
  ];

  return (
    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((c) => (
        <GlassCard key={c.label} className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {c.label}
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight">
            {c.value}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function ResponseTimesCard() {
  const { data: metrics } = useMyMetrics();
  const bars = [
    { label: "First Response Time", value: metrics?.avgFirstResponse ?? "00:00:00" },
    { label: "Average Response Time", value: metrics?.avgResponse ?? "00:00:00" },
    { label: "Average Pickup Time", value: metrics?.avgPickup ?? "00:00:00" },
  ];
  const maxSec = Math.max(...bars.map((b) => hmsToSeconds(b.value)), 1);

  return (
    <GlassCard className="p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Response
      </div>
      <h3 className="mt-1 text-xl font-bold">Time to respond & pick up</h3>
      <div className="mt-5 space-y-5">
        {bars.map((b) => {
          const pct = Math.min(100, (hmsToSeconds(b.value) / maxSec) * 100);
          return (
            <div key={b.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{b.label}</span>
                <span className="font-mono font-bold tabular-nums">{b.value}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/55 ring-1 ring-white/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#57b85c] to-[#4BA3E3] shadow-[0_0_12px_-2px_rgba(87,184,92,0.6)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span>0</span>
        <span>hh:mm:ss</span>
        <span>{fmtHMS(maxSec)}</span>
      </div>
    </GlassCard>
  );
}

function TicketVolumeCard({ agentId }: { agentId: string }) {
  const { data: tickets = [] } = useAgentTickets(agentId);

  // Build the last 7 day-buckets (oldest → newest).
  const days: Date[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    days.push(d);
  }

  const volume = days.map((d) => {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const inDay = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= d.getTime() && t < next.getTime();
    };
    const backlogs = tickets.filter(
      (t) => inDay(t.createdAt) && !CLOSED_STATUSES.includes(t.status.toLowerCase()),
    ).length;
    const closed = tickets.filter(
      (t) => CLOSED_STATUSES.includes(t.status.toLowerCase()) && inDay(t.updatedAt),
    ).length;
    return { date: d.toLocaleDateString([], { weekday: "short" }), backlogs, closed };
  });

  const open = tickets.filter((t) => !CLOSED_STATUSES.includes(t.status.toLowerCase())).length;
  const totalClosed7 = volume.reduce((s, v) => s + v.closed, 0);

  return (
    <GlassCard className="mt-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Last 7 days
          </div>
          <h3 className="mt-1 text-xl font-bold">Ticket volume</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stat label="Tickets (Total)" value={String(tickets.length)} />
          <Stat label="Open" value={String(open)} />
          <Stat label="Closed" value={String(tickets.length - open)} />
          <Stat label="Closed/Day (Avg)" value={(totalClosed7 / 7).toFixed(1)} />
        </div>
      </div>

      <div className="mt-5 h-[300px]">
        <ResponsiveContainer>
          <LineChart data={volume} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} strokeDasharray="3 6" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid #fff",
                borderRadius: 14,
                backdropFilter: "blur(12px)",
              }}
            />
            <Line
              type="monotone"
              dataKey="backlogs"
              stroke="#e85d6b"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#fff", stroke: "#e85d6b", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="closed"
              stroke="#4BA3E3"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#fff", stroke: "#4BA3E3", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-5 text-xs">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#e85d6b]" /> Backlogs
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#4BA3E3]" /> Closed
        </span>
      </div>
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/55 px-3 py-1.5 ring-1 ring-white/70 dark:bg-muted/70 dark:ring-card">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm font-bold tabular-nums text-sky">{value}</div>
    </div>
  );
}

function fmtHMS(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SessionMetricsCard() {
  const { data: s, isLoading } = useQuery({
    queryKey: ["session-metrics", 30],
    queryFn: () => analyticsService.getSessionMetrics(30, "me"),
    retry: 1,
    refetchInterval: 60_000,
  });

  const tiles = [
    {
      label: "Avg pickup time",
      value: s?.avgPickup ?? "—",
      color: "#e85d6b",
      bg: "bg-[oklch(0.97_0.04_25)]",
      ring: "ring-[oklch(0.82_0.12_25)]/40",
    },
    {
      label: "Avg response time",
      value: s?.avgResponse ?? "—",
      color: "#57b85c",
      bg: "bg-[oklch(0.97_0.04_145)]",
      ring: "ring-brand/30",
    },
    {
      label: "Avg first response time",
      value: s?.avgFirstResponse ?? "—",
      color: "#4BA3E3",
      bg: "bg-[oklch(0.97_0.04_240)]",
      ring: "ring-sky/30",
    },
  ];
  return (
    <GlassCard className="mt-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Session
          </div>
          <h3 className="mt-1 text-xl font-bold">Session metrics</h3>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-2xl ${t.bg} px-5 py-4 ring-1 ${t.ring}`}>
            <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: t.color }}>
              {t.value} <span className="text-sm font-semibold opacity-70">hrs</span>
            </div>
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 h-[340px]">
        <ResponsiveContainer>
          <ComposedChart
            data={s?.series ?? []}
            margin={{ top: 10, right: 10, left: 30, bottom: 30 }}
          >
            <CartesianGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="3 6" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              angle={-45}
              textAnchor="end"
              interval={0}
              height={50}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickFormatter={(v) => fmtHMS(v)}
              label={{
                value: "Time",
                angle: -90,
                position: "insideLeft",
                offset: -10,
                style: { fill: "#94a3b8", fontSize: 11, textAnchor: "middle" },
              }}
            />
            <Tooltip
              formatter={(v, name) => [fmtHMS(Number(v)) + " hrs", name]}
              contentStyle={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid #fff",
                borderRadius: 14,
                backdropFilter: "blur(12px)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="circle" />
            <Bar
              dataKey="response"
              name="Avg response time"
              fill="#57b85c"
              radius={[6, 6, 0, 0]}
              barSize={10}
              fillOpacity={0.65}
            />
            <Bar
              dataKey="firstResponse"
              name="Avg first response time"
              fill="#4BA3E3"
              radius={[6, 6, 0, 0]}
              barSize={10}
              fillOpacity={0.65}
            />
            <Line
              type="monotone"
              dataKey="pickup"
              name="Avg pickup time"
              stroke="#e85d6b"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#fff", stroke: "#e85d6b", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
