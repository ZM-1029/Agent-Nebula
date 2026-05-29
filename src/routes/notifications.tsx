import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { notifications } from "@/data/dummy";
import { AlertTriangle, CheckCircle2, Info, Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Frankie" },
      { name: "description", content: "Activity feed: SLA risks, CSAT wins, AI drafts, and shift handoffs." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const iconFor = (k: string) => k === "warn" ? AlertTriangle : k === "good" ? CheckCircle2 : Info;
  const tone = (k: string) => k === "warn" ? "from-amber/25 to-amber/10 text-[oklch(0.5_0.14_70)]" : k === "good" ? "from-brand/20 to-brand/5 text-brand" : "from-sky/20 to-sky/5 text-[oklch(0.42_0.12_240)]";
  return (
    <AppShell>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today</div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">Notifications <span className="rounded-full bg-sky/15 px-2 py-0.5 text-xs font-semibold text-[oklch(0.42_0.12_240)]">5 new</span></h1>
      </div>
      <div className="mt-6 grid gap-3">
        {notifications.map(n => {
          const Ic = iconFor(n.kind);
          return (
            <GlassCard key={n.id} className="flex items-start gap-4 p-4">
              <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${tone(n.kind)}`}>
                <Ic className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground">{n.time}</div>
                </div>
                <div className="text-[13px] text-foreground/75">{n.body}</div>
              </div>
              <button className="rounded-full bg-white/60 px-3 py-1 text-[11px] font-semibold">View</button>
            </GlassCard>
          );
        })}
        <div className="mt-4 grid place-items-center text-xs text-muted-foreground">
          <Bell className="mb-1 h-4 w-4" /> You're all caught up.
        </div>
      </div>
    </AppShell>
  );
}
