import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { agentReports } from "@/data/dummy";
import { useState } from "react";
import { ChevronDown, MessageSquareText } from "lucide-react";

export const Route = createFileRoute("/ticket-queue")({
  head: () => ({
    meta: [
      { title: "Session Queue List — Frankie" },
      { name: "description", content: "Session queue list with agent pickup and response performance." },
    ],
  }),
  component: SessionQueue,
});

const ranges = ["Last 7 days", "Last 30 days", "Last 90 days"] as const;

function SessionQueue() {
  const [range, setRange] = useState<typeof ranges[number]>("Last 30 days");
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
          <h1 className="text-3xl font-bold tracking-tight">Session Queue List</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pickup speed and response times across your support team.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterPill>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as typeof ranges[number])}
              className="cursor-pointer appearance-none bg-transparent pr-5 text-xs font-semibold outline-none"
            >
              {ranges.map(r => <option key={r}>{r}</option>)}
            </select>
          </FilterPill>
        </div>
      </div>

      <GlassCard className="mt-6 overflow-hidden p-0">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/60 text-left text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-4 py-4 font-semibold">Attended</th>
              <th className="px-4 py-4 font-semibold">Avg pickup time</th>
              <th className="px-4 py-4 font-semibold">Avg first response time</th>
              <th className="px-6 py-4 font-semibold">Avg response time</th>
              <th className="px-6 py-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {agentReports.map((a) => (
              <tr
                key={a.id}
                onClick={() => navigate({ to: "/ticket-queue/$agentId", params: { agentId: a.id } })}
                className="group relative cursor-pointer border-b border-dashed border-foreground/10 last:border-0 transition"
              >
                <td className="relative px-6 py-4">
                  <span className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-brand to-sky opacity-0 transition group-hover:opacity-100" />
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={a.avatar}
                        alt={a.name}
                        className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.18)]"
                      />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold tracking-tight">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-[15px] font-medium tabular-nums">{a.attended}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-[14px] tabular-nums text-foreground/80">{a.avgPickup}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-[14px] tabular-nums text-foreground/80">{a.avgFirstResponse}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-[14px] tabular-nums text-foreground/80">{a.avgResponse}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate({ to: "/live-chats" }); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_22px_-10px_rgba(87,184,92,0.9)] transition hover:brightness-105"
                  >
                    <MessageSquareText className="h-3.5 w-3.5" />
                    Start chat
                  </button>
                </td>
                <td className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-white/0 transition group-hover:bg-white/70 group-hover:shadow-[0_12px_36px_-18px_rgba(15,23,42,0.35)]" />
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </GlassCard>
    </AppShell>
  );
}

function FilterPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold text-foreground/80 backdrop-blur transition hover:bg-white/80">
      {children}
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
    </div>
  );
}
