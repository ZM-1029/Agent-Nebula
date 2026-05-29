import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { tickets } from "@/lib/admin-mock/data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Paperclip, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/tickets/$ticketId")({
  head: ({ params }) => ({ meta: [{ title: `${params.ticketId} — Helix` }] }),
  component: TicketDetail,
});

const stages = ["open","pending","in_progress","escalated","resolved","closed"];

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const t = tickets.find(x => x.id === ticketId) ?? tickets[0];
  const currentStage = stages.indexOf(t.status);

  return (
    <div className="space-y-4">
      <Link to="/admin/tickets" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> All tickets</Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <GlassCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-primary">{t.id}</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">{t.subject}</h1>
                <p className="mt-1 text-xs text-muted-foreground">{t.customer} • {t.channel} • Updated {t.updated}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Assign</Button>
                <Button size="sm" className="gradient-primary text-primary-foreground">Resolve</Button>
              </div>
            </div>

            {/* Status flow */}
            <div className="mt-5 flex items-center gap-1.5">
              {stages.map((s, i) => (
                <div key={s} className="flex flex-1 items-center gap-1.5">
                  <div className={cn("flex h-7 flex-1 items-center justify-center rounded-lg text-[11px] font-medium capitalize",
                    i < currentStage && "bg-primary/15 text-primary",
                    i === currentStage && "gradient-primary text-primary-foreground",
                    i > currentStage && "bg-muted text-muted-foreground",
                  )}>{s.replace("_"," ")}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <p className="text-sm font-semibold">Conversation</p>
            <div className="mt-3 space-y-3">
              {[
                { from: "Customer", text: "Hi — we tried to upgrade our annual plan but the payment failed even though the card was authorized.", ts: "2h ago" },
                { from: "John Doe", text: "Looking into this now. I can see the auth on Stripe — checking why our webhook hasn't picked it up.", ts: "1h ago" },
                { from: "System", text: "Internal note: webhook delivery delayed by 18 minutes for stripe-events-v3.", ts: "1h ago", note: true },
                { from: "Customer", text: "Thanks — appreciate the quick response.", ts: "44m ago" },
              ].map((m, i) => (
                <div key={i} className={cn("rounded-2xl border border-border/60 p-3", m.note ? "bg-accent-amber/10 border-accent-amber/40" : "bg-background/40")}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{m.from}</p>
                    <p className="text-[10px] text-muted-foreground">{m.ts}</p>
                  </div>
                  <p className="mt-1 text-sm">{m.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2">
              <Button variant="ghost" size="icon" className="h-8 w-8"><Paperclip className="h-4 w-4" /></Button>
              <input placeholder="Reply or add an internal note…" className="h-9 flex-1 bg-transparent text-sm outline-none" />
              <Button className="h-9 gradient-primary text-primary-foreground"><Send className="mr-1 h-3 w-3" /> Reply</Button>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
            <dl className="mt-2 space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-muted-foreground">Priority</dt><dd className="font-medium capitalize">{t.priority}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium capitalize">{t.status.replace("_"," ")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Assignee</dt><dd className="font-medium">{t.agent}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Department</dt><dd className="font-medium">Billing</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">SLA elapsed</dt><dd className="font-medium">{100-t.sla}%</dd></div>
            </dl>
          </GlassCard>

          <GlassCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["billing","stripe","upgrade","enterprise"].map(t => (
                <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium">{t}</span>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Timeline</p>
            <ol className="relative mt-2 space-y-3 border-l border-border/60 pl-3 text-xs">
              {[
                {t:"Ticket opened",ts:"2h ago"},
                {t:"Auto-categorized as Billing",ts:"2h ago"},
                {t:"Assigned to John Doe",ts:"1h 50m"},
                {t:"Webhook event re-queued",ts:"45m"},
                {t:"Awaiting customer reply",ts:"30m"},
              ].map((e,i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                  <p className="font-medium">{e.t}</p>
                  <p className="text-[10px] text-muted-foreground">{e.ts}</p>
                </li>
              ))}
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
