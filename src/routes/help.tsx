import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { BookOpen, Sparkles, Zap, Search, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — Frankie" },
      { name: "description", content: "Playbooks, AI prompts, and guides for getting the most out of Frankie." },
    ],
  }),
  component: Help,
});

const articles = [
  { t: "How SLA timers and breach alerts work", c: "Playbooks", icon: Zap },
  { t: "Writing canned replies that don't feel canned", c: "Voice", icon: BookOpen },
  { t: "AI co-pilot: when to trust the suggestion", c: "AI", icon: Sparkles },
  { t: "Handing off shifts without dropping context", c: "Operations", icon: BookOpen },
  { t: "Setting up Slack escalations in 60 seconds", c: "Integrations", icon: Zap },
  { t: "De-escalating with empathy: a 4-step framework", c: "Voice", icon: BookOpen },
];

function Help() {
  return (
    <AppShell>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today</div>
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search 240+ playbooks, prompts, and guides — written by the Frankie team.</p>
      </div>

      <GlassCard className="mt-6 p-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="What can we help with?" className="w-full rounded-2xl bg-white/60 py-3.5 pl-11 pr-4 text-sm outline-none focus:bg-white/85" />
        </label>
      </GlassCard>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {articles.map(a => (
          <GlassCard key={a.t} className="group cursor-pointer p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-20px_rgba(87,184,92,0.45)]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand/20 to-sky/15 text-brand"><a.icon className="h-5 w-5" /></div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{a.c}</span>
              <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:text-brand" />
            </div>
            <div className="mt-4 text-[15px] font-semibold leading-snug">{a.t}</div>
            <div className="mt-2 text-xs text-muted-foreground">4 min read · updated this week</div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}
