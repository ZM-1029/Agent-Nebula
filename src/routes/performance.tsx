import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { agentScorecard, sessionMetrics } from "@/data/dummy";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Mail, Phone, Hash, Smartphone, Languages, MapPin, ArrowDown, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance — Frankie" },
      { name: "description", content: "Agent scorecard: tickets, response times, channel mix, and happiness rating." },
    ],
  }),
  component: Performance,
});

function Performance() {
  const a = agentScorecard;
  const k = a.kpis;

  const kpiCards = [
    { label: "Open Tickets",            value: String(k.openTickets),       delta: k.openDelta,          trend: k.openTrend,          good: "down" as const },
    { label: "Closed Tickets",          value: String(k.closedTickets),     delta: k.closedDelta,        trend: k.closedTrend,        good: "up" as const },
    { label: "Average Response Time",   value: `${k.avgResponse} hrs`,      delta: `${k.avgResponseDelta} hrs`,   trend: k.avgResponseTrend,   good: "down" as const },
    { label: "Average Resolution Time", value: `${k.avgResolution} hrs`,    delta: `${k.avgResolutionDelta} hrs`, trend: k.avgResolutionTrend, good: "down" as const },
    { label: "Happiness Rating",        value: `${k.happiness}%`,           delta: k.happinessDelta,     trend: k.happinessTrend,     good: "up" as const },
  ];

  return (
    <AppShell>
      <div>
        <div className="min-w-0">
          <div className="mb-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Performance Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Pickup speed and response times across your support team.</p>
          </div>
          {/* KPI strip */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {kpiCards.map((c) => {
              const isGood = c.trend === c.good;
              return (
                <GlassCard key={c.label} className="p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{c.label}</div>
                  <div className="mt-2 font-mono text-2xl font-bold tabular-nums tracking-tight">{c.value}</div>
                  <div className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${isGood ? "text-brand" : "text-[oklch(0.62_0.22_25)]"}`}>
                    {c.trend === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {c.delta}
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* Mid row */}
          <div className="mt-5">
            <ResponseTimesCard />
          </div>

          {/* Session metrics */}
          <SessionMetricsCard />

          {/* Ticket volume */}
          <TicketVolumeCard />
        </div>
      </div>
    </AppShell>
  );
}

function ProfileRail() {
  const a = agentScorecard;
  return (
    <GlassCard className="h-fit p-6">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <img src={a.avatar} alt={a.name} className="h-24 w-24 rounded-full bg-white/70 object-cover ring-4 ring-white/80 shadow-[0_10px_30px_-8px_rgba(87,184,92,0.55)]" />
          <span className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-brand ring-2 ring-white" />
        </div>
        <div className="mt-3 text-lg font-bold tracking-tight">{a.name}</div>
        <div className="mt-1 inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand">{a.role}</div>
      </div>

      <div className="mt-5 space-y-2.5 text-sm">
        <Row icon={<Mail className="h-3.5 w-3.5" />} value={a.email} />
        <Row icon={<Phone className="h-3.5 w-3.5" />} value={a.phone} />
        <Row icon={<Hash className="h-3.5 w-3.5" />} value={`Ext ${a.extn}`} />
        <Row icon={<Smartphone className="h-3.5 w-3.5" />} value={a.mobile} />
        <Row icon={<Languages className="h-3.5 w-3.5" />} value={a.language} />
        <Row icon={<MapPin className="h-3.5 w-3.5" />} value={a.location} />
      </div>

      <Section title="Departments">
        <div className="flex flex-wrap gap-1.5">
          {a.departments.map((d) => (
            <span key={d} className="rounded-full bg-white/65 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/70">{d}</span>
          ))}
        </div>
      </Section>

      <Section title="Channel Expert">
        <div className="flex flex-wrap gap-1.5">
          {a.channelExpert.map((c) => (
            <span key={c} className="rounded-full bg-sky/10 px-2.5 py-1 text-[11px] font-semibold text-sky ring-1 ring-sky/20">{c}</span>
          ))}
        </div>
      </Section>

      <Section title="Feedback Widget">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand ring-1 ring-brand/20">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Enabled
        </span>
      </Section>
    </GlassCard>
  );
}

function Row({ icon, value }: { icon: React.ReactNode; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 text-muted-foreground">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-white/65 text-foreground/70 ring-1 ring-white/70">{icon}</span>
      <span className="truncate text-[12.5px] text-foreground/85">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-white/60 pt-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}


function ResponseTimesCard() {
  const a = agentScorecard;
  return (
    <GlassCard className="p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Response</div>
      <h3 className="mt-1 text-xl font-bold">Time to respond & resolve</h3>
      <div className="mt-5 space-y-5">
        {a.responseBars.map((b) => {
          const pct = Math.min(100, (b.hours / a.responseMax) * 100);
          return (
            <div key={b.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{b.label}</span>
                <span className="font-mono font-bold tabular-nums">{b.display}</span>
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
        <span>Average in hours</span>
        <span>{a.responseMax}</span>
      </div>
    </GlassCard>
  );
}

function TicketVolumeCard() {
  const a = agentScorecard;
  return (
    <GlassCard className="mt-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Last 7 days</div>
          <h3 className="mt-1 text-xl font-bold">Ticket volume</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stat label="Tickets (Total)"    value={String(a.totals.tickets)} />
          <Stat label="Responses (Total)"  value={String(a.totals.responses)} />
          <Stat label="Threads/Ticket"     value={a.totals.threadsAvg.toFixed(2)} />
          <Stat label="Closed/Day (Avg)"   value={a.totals.closedAvg.toFixed(1)} />
        </div>
      </div>

      <div className="mt-5 h-[300px]">
        <ResponsiveContainer>
          <LineChart data={a.volume} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} strokeDasharray="3 6" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={{ background: "rgba(255,255,255,0.92)", border: "1px solid #fff", borderRadius: 14, backdropFilter: "blur(12px)" }} />
            <Line type="monotone" dataKey="backlogs" stroke="#e85d6b" strokeWidth={2.5} dot={{ r: 4, fill: "#fff", stroke: "#e85d6b", strokeWidth: 2 }} />
            <Line type="monotone" dataKey="closed"   stroke="#4BA3E3" strokeWidth={2.5} dot={{ r: 4, fill: "#fff", stroke: "#4BA3E3", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-center gap-5 text-xs">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#e85d6b]" /> Backlogs</span>
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4BA3E3]" /> Closed</span>
      </div>
    </GlassCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/55 px-3 py-1.5 ring-1 ring-white/70">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
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
  const s = sessionMetrics;
  const tiles = [
    { label: "Avg pickup time",         value: s.avgPickup,         color: "#e85d6b", bg: "bg-[oklch(0.97_0.04_25)]",  ring: "ring-[oklch(0.82_0.12_25)]/40" },
    { label: "Avg response time",       value: s.avgResponse,       color: "#57b85c", bg: "bg-[oklch(0.97_0.04_145)]", ring: "ring-brand/30" },
    { label: "Avg first response time", value: s.avgFirstResponse,  color: "#4BA3E3", bg: "bg-[oklch(0.97_0.04_240)]", ring: "ring-sky/30" },
  ];
  return (
    <GlassCard className="mt-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Session</div>
          <h3 className="mt-1 text-xl font-bold">Session metrics</h3>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-2xl ${t.bg} px-5 py-4 ring-1 ${t.ring}`}>
            <div className="font-mono text-2xl font-bold tabular-nums" style={{ color: t.color }}>{t.value} <span className="text-sm font-semibold opacity-70">hrs</span></div>
            <div className="mt-0.5 text-xs font-medium text-muted-foreground">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 h-[340px]">
        <ResponsiveContainer>
          <ComposedChart data={s.series} margin={{ top: 10, right: 10, left: 30, bottom: 30 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.06)" strokeDasharray="3 6" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} angle={-45} textAnchor="end" interval={0} height={50} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtHMS(v)} label={{ value: "Time", angle: -90, position: "insideLeft", offset: -10, style: { fill: "#94a3b8", fontSize: 11, textAnchor: "middle" } }} />
            <Tooltip
              formatter={(v, name) => [fmtHMS(Number(v)) + " hrs", name]}
              contentStyle={{ background: "rgba(255,255,255,0.92)", border: "1px solid #fff", borderRadius: 14, backdropFilter: "blur(12px)" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="circle" />
            <Bar  dataKey="response"      name="Avg response time"       fill="#57b85c" radius={[6,6,0,0]} barSize={10} fillOpacity={0.65} />
            <Bar  dataKey="firstResponse" name="Avg first response time" fill="#4BA3E3" radius={[6,6,0,0]} barSize={10} fillOpacity={0.65} />
            <Line type="monotone" dataKey="pickup" name="Avg pickup time" stroke="#e85d6b" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", stroke: "#e85d6b", strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
