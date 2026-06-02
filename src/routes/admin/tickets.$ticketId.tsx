import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { ticketsService } from "@/services/ticketsService";
import { agentsService } from "@/services/agentsService";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Send, Loader2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef, useState } from "react";

export const Route = createFileRoute("/admin/tickets/$ticketId")({
  head: ({ params }) => ({ meta: [{ title: `${params.ticketId} — Helix` }] }),
  component: TicketDetail,
});

const stages = ["open", "pending", "in_progress", "escalated", "resolved", "closed"];

/** Maps the lowercase stage key → the API/backend status string */
const stageToStatus: Record<string, string> = {
  open: "Open",
  pending: "Pending",
  in_progress: "InProgress",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};

/** Reverse: API/backend status string → stage key */
const statusToStage: Record<string, string> = Object.fromEntries(
  Object.entries(stageToStatus).map(([k, v]) => [v, k]),
);

function TicketDetail() {
  const { ticketId } = Route.useParams();
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsService.getAll(),
    staleTime: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      ticketsService.update(ticketId, { status }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success(`Status changed to ${status.replace("_", " ")}`);
    },
    onError: () => toast.error("Failed to update status."),
  });

  const noteMutation = useMutation({
    mutationFn: (content: string) => ticketsService.addNote(ticketId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setNoteText("");
      inputRef.current?.focus();
    },
    onError: () => toast.error("Failed to add note."),
  });

  const submitNote = () => {
    const text = noteText.trim();
    if (!text || noteMutation.isPending) return;
    noteMutation.mutate(text);
  };

  const assignMutation = useMutation({
    mutationFn: (agentId: string) =>
      ticketsService.update(ticketId, { assignedAgentId: agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setAssignOpen(false);
      toast.success("Ticket assigned.");
    },
    onError: () => toast.error("Failed to assign ticket."),
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

  // Normalize backend status ("InProgress") → stage key ("in_progress") before lookup
  const currentStage = stages.indexOf(statusToStage[t.status] ?? t.status.toLowerCase());
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
                {/* Assign popover */}
                <Popover open={assignOpen} onOpenChange={setAssignOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                      {t.assignedAgent ? "Reassign" : "Assign"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-1">
                    {agents.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                        No agents found.
                      </p>
                    ) : (
                      <ul className="space-y-0.5">
                        {agents.map((a) => (
                          <li key={a.id}>
                            <button
                              disabled={assignMutation.isPending}
                              onClick={() => assignMutation.mutate(a.id)}
                              className={cn(
                                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-accent",
                                t.assignedAgent?.id === a.id && "bg-primary/10 text-primary",
                                assignMutation.isPending && "cursor-not-allowed opacity-60",
                              )}
                            >
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                                {a.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium leading-tight">{a.name}</p>
                                <p className="truncate text-[10px] text-muted-foreground capitalize">{a.role}</p>
                              </div>
                              {assignMutation.isPending && assignMutation.variables === a.id && (
                                <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                              )}
                              {t.assignedAgent?.id === a.id && (
                                <span className="text-[9px] font-semibold text-primary shrink-0">current</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </PopoverContent>
                </Popover>

                <Button
                  size="sm"
                  className="gradient-primary text-primary-foreground"
                  disabled={statusMutation.isPending || t.status.toLowerCase() === "resolved"}
                  onClick={() => statusMutation.mutate("Resolved")}
                >
                  {statusMutation.isPending && statusMutation.variables === stageToStatus.resolved ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Resolve"
                  )}
                </Button>
              </div>
            </div>

            {/* Status flow — click any stage to change status */}
            <div className="mt-5 flex items-center gap-1.5">
              {stages.map((s, i) => {
                const isActive = i === currentStage;
                const isPending = statusMutation.isPending && statusMutation.variables === stageToStatus[s];
                return (
                  <button
                    key={s}
                    disabled={isActive || statusMutation.isPending}
                    onClick={() => statusMutation.mutate(stageToStatus[s])}
                    title={isActive ? "Current status" : `Set to ${s.replace("_", " ")}`}
                    className={cn(
                      "flex h-7 flex-1 items-center justify-center rounded-lg text-[11px] font-medium capitalize transition",
                      i < currentStage && "bg-primary/15 text-primary hover:bg-primary/25",
                      isActive && "gradient-primary text-primary-foreground cursor-default",
                      i > currentStage && "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                      !isActive && !statusMutation.isPending && "cursor-pointer",
                      !isActive && statusMutation.isPending && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : s.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Conversation + Notes */}
          <GlassCard>
            <p className="text-sm font-semibold">Conversation</p>
            <div className="mt-3 space-y-3">
              {(!t.messages || t.messages.length === 0) && (!t.notes || t.notes.length === 0) ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No messages yet.</p>
              ) : (
                [
                  ...(t.messages ?? []).map((m) => ({ ...m, _type: "msg" as const, _ts: m.timestamp })),
                  ...(t.notes ?? []).map((n) => ({ ...n, _type: "note" as const, _ts: n.createdAt })),
                ]
                  .sort((a, b) => new Date(a._ts).getTime() - new Date(b._ts).getTime())
                  .map((item, i) =>
                    item._type === "note" ? (
                      <div
                        key={`note-${item.id}`}
                        className="rounded-2xl border border-primary/30 bg-primary/5 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold">{item.authorName}</p>
                            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                              note
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <p className="mt-1 text-sm">{item.content}</p>
                      </div>
                    ) : (
                      <div
                        key={`msg-${i}`}
                        className={cn(
                          "rounded-2xl border border-border/60 p-3",
                          item.senderType === "System"
                            ? "bg-accent-amber/10 border-accent-amber/40"
                            : "bg-background/40",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold">{item.senderName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <p className="mt-1 text-sm">{item.content}</p>
                      </div>
                    ),
                  )
              )}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2">
              <input
                ref={inputRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && submitNote()}
                placeholder="Add an internal note…"
                className="h-9 flex-1 bg-transparent text-sm outline-none px-1"
                disabled={noteMutation.isPending}
              />
              <Button
                className="h-9 gradient-primary text-primary-foreground"
                disabled={!noteText.trim() || noteMutation.isPending}
                onClick={submitNote}
              >
                {noteMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-1 h-3 w-3" /> Add Note
                  </>
                )}
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
