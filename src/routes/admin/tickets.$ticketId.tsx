import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { ticketsService } from "@/services/ticketsService";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Paperclip, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/tickets/$ticketId")({
  head: ({ params }) => ({ meta: [{ title: `${params.ticketId} — Helix` }] }),
  component: TicketDetail,
});

const stages = ["open", "pending", "in_progress", "escalated", "resolved", "closed"];

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const queryClient = useQueryClient();

  const {
    data: t,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => ticketsService.getById(ticketId),
    retry: 1,
    refetchInterval: 30_000,
  });

  const resolveMutation = useMutation({
    mutationFn: () => ticketsService.update(ticketId, { status: "Resolved" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !t) {
    return (
      <div className="space-y-3">
        <Link
          to="/admin/tickets"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> All tickets
        </Link>
        <p className="text-sm text-destructive">Ticket not found or failed to load.</p>
      </div>
    );
  }

  const currentStage = stages.indexOf(t.status.toLowerCase());
  const slaUsed = t.slaDeadline
    ? Math.min(
        100,
        Math.round(
          ((Date.now() - new Date(t.createdAt).getTime()) /
            (new Date(t.slaDeadline).getTime() - new Date(t.createdAt).getTime())) *
            100,
        ),
      )
    : 0;

  return (
    <div className="space-y-4">
      <Link
        to="/admin/tickets"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All tickets
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <GlassCard>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-primary">{t.reference}</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight">{t.subject}</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.customerName} •{" "}
                  {new Date(t.updatedAt).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Assign
                </Button>
                <Button
                  size="sm"
                  className="gradient-primary text-primary-foreground"
                  disabled={resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate()}
                >
                  {resolveMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Resolve"
                  )}
                </Button>
              </div>
            </div>

            {/* Status flow */}
            <div className="mt-5 flex items-center gap-1.5">
              {stages.map((s, i) => (
                <div key={s} className="flex flex-1 items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-7 flex-1 items-center justify-center rounded-lg text-[11px] font-medium capitalize",
                      i < currentStage && "bg-primary/15 text-primary",
                      i === currentStage && "gradient-primary text-primary-foreground",
                      i > currentStage && "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.replace("_", " ")}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Conversation */}
          <GlassCard>
            <p className="text-sm font-semibold">Conversation</p>
            <div className="mt-3 space-y-3">
              {t.messages && t.messages.length > 0 ? (
                t.messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-2xl border border-border/60 p-3",
                      m.senderType === "System"
                        ? "bg-accent-amber/10 border-accent-amber/40"
                        : "bg-background/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{m.senderName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="mt-1 text-sm">{m.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No messages yet.
                </p>
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                placeholder="Reply or add an internal note…"
                className="h-9 flex-1 bg-transparent text-sm outline-none"
              />
              <Button className="h-9 gradient-primary text-primary-foreground">
                <Send className="mr-1 h-3 w-3" /> Reply
              </Button>
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Details
            </p>
            <dl className="mt-2 space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="font-medium capitalize">{t.priority}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize">{t.status.replace("_", " ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Assignee</dt>
                <dd className="font-medium">{t.assignedAgent?.name ?? "Unassigned"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">SLA elapsed</dt>
                <dd className="font-medium">{slaUsed}%</dd>
              </div>
              {t.slaBreach && (
                <div className="rounded-lg bg-destructive/10 px-2 py-1 text-destructive text-[10px] font-semibold">
                  SLA breached
                </div>
              )}
            </dl>
          </GlassCard>

          {t.tags && t.tags.length > 0 && (
            <GlassCard>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}

          <GlassCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Timeline
            </p>
            <ol className="relative mt-2 space-y-3 border-l border-border/60 pl-3 text-xs">
              <li className="relative">
                <span className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                <p className="font-medium">Ticket opened</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(t.createdAt).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </li>
              {t.assignedAgent && (
                <li className="relative">
                  <span className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                  <p className="font-medium">Assigned to {t.assignedAgent.name}</p>
                </li>
              )}
              <li className="relative">
                <span className="absolute -left-[14px] top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                <p className="font-medium">
                  Status: <span className="capitalize">{t.status.replace("_", " ")}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(t.updatedAt).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              </li>
            </ol>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
