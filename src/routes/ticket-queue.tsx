import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { liveChatService } from "@/services/liveChatService";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText, Loader2, Clock } from "lucide-react";

export const Route = createFileRoute("/ticket-queue")({
  head: () => ({
    meta: [
      { title: "Session Queue List — Frankie" },
      {
        name: "description",
        content: "Customers waiting for a live agent — pick one to accept.",
      },
    ],
  }),
  component: SessionQueue,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Whole minutes a customer has waited since joining the queue. */
function waitMinutes(queuedAt: string) {
  const ms = Date.now() - new Date(queuedAt).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function formatWait(mins: number) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

function SessionQueue() {
  const navigate = useNavigate();

  const {
    data: queue = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["session-queue"],
    queryFn: () => liveChatService.getQueue(),
    retry: 1,
    refetchInterval: 10_000,
  });

  // Hand the chosen session to the Live Chats workspace, which accepts it over
  // its live hub connection (so the agent lands in an active conversation).
  const accept = (sessionId: string) => {
    sessionStorage.setItem("pendingAcceptSession", sessionId);
    navigate({ to: "/live-chats" });
  };

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Session Queue List</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Customers waiting for a live agent — pick one to accept.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold text-foreground/80 backdrop-blur">
            {queue.length} waiting
          </span>
          <button
            onClick={() => refetch()}
            className="rounded-full border border-white/70 bg-white/60 px-4 py-2 text-xs font-semibold text-foreground/80 backdrop-blur transition hover:bg-white/80"
          >
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <GlassCard className="mt-6 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/60 text-left text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-4 py-4 font-semibold">Reference</th>
                <th className="px-4 py-4 font-semibold">Issue</th>
                <th className="px-4 py-4 font-semibold">Waiting</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-destructive">
                    Couldn't load the queue.
                  </td>
                </tr>
              ) : queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No customers waiting in the queue.
                  </td>
                </tr>
              ) : (
                queue.map((q) => {
                  const wait = waitMinutes(q.queuedAt);
                  return (
                    <tr
                      key={q.id}
                      className="border-b border-dashed border-foreground/10 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber/20 text-xs font-bold text-amber ring-2 ring-white">
                            {initials(q.customerName)}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[14px] font-semibold tracking-tight">
                              {q.customerName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              #{q.position} in queue
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-[12px]">{q.reference}</span>
                      </td>
                      <td className="max-w-[280px] px-4 py-4">
                        <span className="line-clamp-2 text-[13px] text-foreground/70">
                          {q.issueDescription || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 font-mono text-[11px] font-bold text-amber">
                          <Clock className="h-3 w-3" />
                          {formatWait(wait)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => accept(q.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-[0_8px_22px_-10px_rgba(87,184,92,0.9)] transition hover:brightness-105"
                        >
                          <MessageSquareText className="h-3.5 w-3.5" />
                          Accept chat
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </AppShell>
  );
}
