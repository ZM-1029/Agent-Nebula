import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/admin/glass-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Volume2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationsService, type AppNotification } from "@/services/notificationsService";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Helix" },
      {
        name: "description",
        content: "Realtime alerts, system announcements and notification preferences.",
      },
    ],
  }),
  component: NotifPage,
});

// ── Tone mapping: backend "type" string → visual style ───────────────────────

type ToneKey = "warning" | "destructive" | "primary" | "blue";

function toneForType(type: string): ToneKey {
  const t = type.toLowerCase();
  if (t.includes("offline") || t.includes("error") || t.includes("breach")) return "destructive";
  if (t.includes("transfer") || t.includes("escalat")) return "warning";
  if (t.includes("newchat") || t.includes("new_chat") || t.includes("assign")) return "primary";
  return "blue";
}

const dotClass: Record<ToneKey, string> = {
  warning: "bg-warning",
  destructive: "bg-destructive",
  primary: "bg-primary",
  blue: "bg-accent-blue",
};

// Friendly display names for backend type strings
function friendlyTitle(type: string): string {
  const map: Record<string, string> = {
    NewChat: "New Chat",
    ChatTransferred: "Chat Transferred",
    AgentOffline: "Agent Offline",
    AgentOnline: "Agent Online",
  };
  return map[type] ?? type.replace(/([A-Z])/g, " $1").trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

function NotifPage() {
  const qc = useQueryClient();

  const {
    data: notifications,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsService.getAll,
    refetchInterval: 30_000, // poll every 30 s
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast.error("Failed to mark notification as read"),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: () => toast.error("Failed to mark all as read"),
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Stay on top of SLA breaches, escalations and team activity.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* ── Feed ── */}
        <GlassCard className="p-0">
          <div className="border-b border-border/60 p-4 flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" /> Feed
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {unreadCount} new
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => refetch()}
                className="text-muted-foreground hover:text-foreground transition"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="text-[11px] font-medium text-primary hover:underline disabled:opacity-50"
                >
                  {markAllMutation.isPending ? "Marking…" : "Mark all read"}
                </button>
              )}
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications…
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load notifications.</p>
              <button
                onClick={() => refetch()}
                className="text-xs underline text-muted-foreground hover:text-foreground"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && notifications?.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-1 py-10 text-sm text-muted-foreground">
              <Bell className="h-5 w-5 mb-1 opacity-40" />
              You're all caught up.
            </div>
          )}

          {/* Notification list */}
          {!isLoading && !isError && (notifications?.length ?? 0) > 0 && (
            <div className="divide-y divide-border/40 max-h-[520px] overflow-y-auto">
              {notifications!.map((n: AppNotification) => {
                const tone = toneForType(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markReadMutation.mutate(n.id);
                    }}
                    disabled={n.isRead || markReadMutation.isPending}
                    className={cn(
                      "flex w-full items-start gap-3 p-4 text-left transition hover:bg-accent/40",
                      !n.isRead && "bg-primary/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                        n.isRead ? "bg-muted-foreground/30" : dotClass[tone],
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-semibold truncate",
                            n.isRead && "font-normal text-muted-foreground",
                          )}
                        >
                          {friendlyTitle(n.type)}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {n.message}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* ── Preferences (local UI only) ── */}
        <GlassCard>
          <p className="text-sm font-semibold">Preferences</p>
          <div className="mt-3 space-y-3">
            {[
              {
                l: "New chat assigned",
                d: "Get notified when a conversation is routed to you",
              },
              {
                l: "SLA breach alerts",
                d: "Warn when ticket SLA passes 80% elapsed",
              },
              {
                l: "Mentions in notes",
                d: "When a teammate @mentions you in an internal note",
              },
              {
                l: "Daily digest email",
                d: "Workspace KPIs delivered at 9:00 local time",
              },
              {
                l: "Customer reply",
                d: "Customer responds to one of your threads",
              },
            ].map((p) => (
              <div
                key={p.l}
                className="flex items-start justify-between gap-3 rounded-xl bg-background/40 p-3"
              >
                <div>
                  <Label className="text-xs font-semibold">{p.l}</Label>
                  <p className="text-[11px] text-muted-foreground">{p.d}</p>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl bg-background/40 p-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <Label className="text-xs font-semibold">Sound alerts</Label>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
