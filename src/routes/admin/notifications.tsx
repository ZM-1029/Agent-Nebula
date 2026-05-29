import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { notifications } from "@/lib/admin-mock/data";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Helix" }, { name: "description", content: "Realtime alerts, system announcements and notification preferences." }] }),
  component: NotifPage,
});

function NotifPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Stay on top of SLA breaches, escalations and team activity.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard className="p-0">
          <div className="border-b border-border/60 p-4 flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2"><Bell className="h-4 w-4" /> Feed</p>
            <button className="text-[11px] font-medium text-primary hover:underline">Mark all read</button>
          </div>
          <div className="divide-y divide-border/40">
            {[...notifications, ...notifications].map((n, i) => (
              <div key={i} className="flex items-start gap-3 p-4 transition hover:bg-accent/40">
                <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full",
                  n.tone === "warning" && "bg-warning",
                  n.tone === "destructive" && "bg-destructive",
                  n.tone === "primary" && "bg-primary",
                  n.tone === "blue" && "bg-accent-blue",
                )} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground">{n.ts}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <p className="text-sm font-semibold">Preferences</p>
          <div className="mt-3 space-y-3">
            {[
              {l:"New chat assigned",d:"Get notified when a conversation is routed to you"},
              {l:"SLA breach alerts",d:"Warn when ticket SLA passes 80% elapsed"},
              {l:"Mentions in notes",d:"When a teammate @mentions you in an internal note"},
              {l:"Daily digest email",d:"Workspace KPIs delivered at 9:00 local time"},
              {l:"Customer reply",d:"Customer responds to one of your threads"},
            ].map(p => (
              <div key={p.l} className="flex items-start justify-between gap-3 rounded-xl bg-background/40 p-3">
                <div>
                  <Label className="text-xs font-semibold">{p.l}</Label>
                  <p className="text-[11px] text-muted-foreground">{p.d}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-background/40 p-3">
              <div className="flex items-center gap-2"><Volume2 className="h-4 w-4" /><Label className="text-xs font-semibold">Sound alerts</Label></div>
              <Switch defaultChecked />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
