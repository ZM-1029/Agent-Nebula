import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { tickets } from "@/lib/admin-mock/data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/admin/tickets")({
  head: () => ({ meta: [{ title: "Tickets — Helix" }, { name: "description", content: "Ticket queue with SLA, priority, status and filters." }] }),
  component: TicketsPage,
});

const priorityTone: Record<string,string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-accent-rose/15 text-accent-rose",
  medium: "bg-accent-amber/15 text-accent-amber",
  low: "bg-accent-blue/15 text-accent-blue",
};
const statusTone: Record<string,string> = {
  open: "bg-accent-blue/15 text-accent-blue",
  pending: "bg-accent-amber/15 text-accent-amber",
  in_progress: "bg-primary/15 text-primary",
  escalated: "bg-destructive/15 text-destructive",
  resolved: "bg-primary/15 text-primary",
  closed: "bg-muted text-muted-foreground",
};

function TicketsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const list = tickets.filter(t =>
    (status === "all" || t.status === status) &&
    (q === "" || t.subject.toLowerCase().includes(q.toLowerCase()) || t.id.toLowerCase().includes(q.toLowerCase()))
  );
  const counts = {
    all: tickets.length,
    open: tickets.filter(t=>t.status==="open").length,
    in_progress: tickets.filter(t=>t.status==="in_progress").length,
    escalated: tickets.filter(t=>t.status==="escalated").length,
    resolved: tickets.filter(t=>t.status==="resolved").length,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">Triage and resolve customer issues.</p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          {k:"all",l:"All"},{k:"open",l:"Open"},{k:"in_progress",l:"In progress"},{k:"escalated",l:"Escalated"},{k:"resolved",l:"Resolved"},
        ].map(s => (
          <button key={s.k} onClick={() => setStatus(s.k)} className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition",
            status===s.k ? "bg-primary text-primary-foreground" : "glass text-foreground hover:bg-accent",
          )}>{s.l} <span className="ml-1 opacity-70">{counts[s.k as keyof typeof counts]}</span></button>
        ))}
      </div>

      <GlassCard className="p-0">
        <div className="flex items-center gap-2 border-b border-border/60 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by id or subject…" className="h-9 pl-9 bg-background/40" />
          </div>
          <Button variant="outline" size="sm"><Filter className="mr-1 h-3.5 w-3.5" /> Filters</Button>
          <Button variant="outline" size="sm"><ArrowUpDown className="mr-1 h-3.5 w-3.5" /> Sort</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3 font-medium">ID</th><th className="p-3 font-medium">Subject</th><th className="p-3 font-medium">Agent</th><th className="p-3 font-medium">Priority</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {list.map(t => (
                <tr key={t.id} className="border-b border-border/40 transition hover:bg-accent/40">
                  <td className="p-3"><Link to="/admin/tickets/$ticketId" params={{ ticketId: t.id }} className="font-mono text-xs font-semibold text-primary hover:underline">{t.id}</Link></td>
                  <td className="p-3"><p className="font-medium">{t.subject}</p><p className="text-[11px] text-muted-foreground">{t.channel}</p></td>
                  <td className="p-3 text-xs">{t.agent}</td>
                  <td className="p-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", priorityTone[t.priority])}>{t.priority}</span></td>
                  <td className="p-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", statusTone[t.status])}>{t.status.replace("_"," ")}</span></td>
                  <td className="p-3 text-[11px] text-muted-foreground">{t.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
