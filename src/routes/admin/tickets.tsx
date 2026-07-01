import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/admin/glass-card";
import { ticketsService } from "@/services/ticketsService";
import { createLiveChatHub, HubEvents, HubMethods } from "@/services/liveChatService";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/tickets")({
  head: () => ({
    meta: [
      { title: "Tickets — Helix" },
      { name: "description", content: "Ticket queue with SLA, priority, status and filters." },
    ],
  }),
  component: TicketsPage,
});

const priorityTone: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive",
  Urgent: "bg-destructive/15 text-destructive",
  high: "bg-accent-rose/15 text-accent-rose",
  High: "bg-accent-rose/15 text-accent-rose",
  medium: "bg-accent-amber/15 text-accent-amber",
  Medium: "bg-accent-amber/15 text-accent-amber",
  low: "bg-accent-blue/15 text-accent-blue",
  Low: "bg-accent-blue/15 text-accent-blue",
};
const statusTone: Record<string, string> = {
  open: "bg-accent-blue/15 text-accent-blue",
  Open: "bg-accent-blue/15 text-accent-blue",
  pending: "bg-accent-amber/15 text-accent-amber",
  Pending: "bg-accent-amber/15 text-accent-amber",
  in_progress: "bg-primary/15 text-primary",
  InProgress: "bg-primary/15 text-primary",
  escalated: "bg-destructive/15 text-destructive",
  Escalated: "bg-destructive/15 text-destructive",
  resolved: "bg-primary/15 text-primary",
  Resolved: "bg-primary/15 text-primary",
  closed: "bg-muted text-muted-foreground",
  Closed: "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

// Tone the rating badge by score: green for happy, amber for neutral, rose for unhappy.
function ratingTone(n: number) {
  if (n >= 4) return "bg-primary/15 text-primary";
  if (n === 3) return "bg-accent-amber/15 text-accent-amber";
  return "bg-destructive/15 text-destructive";
}

function RatingBadge({ rating }: { rating: number | null }) {
  if (rating == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        ratingTone(rating),
      )}
    >
      <Star className="h-3 w-3 fill-current" />
      {rating}
    </span>
  );
}

function TypeBadge({ chatType }: { chatType: string | null }) {
  if (!chatType) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-accent-blue/15 px-2 py-0.5 text-[10px] font-semibold text-accent-blue">
      {chatType}
    </span>
  );
}

function TicketsPage() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => ticketsService.getAll(),
    retry: 1,
    refetchInterval: 30_000,
  });

  // Live updates: refresh the list the instant a ticket is created (chat
  // ended/resolved) or a session is resolved, instead of waiting for the poll.
  useEffect(() => {
    const hub = createLiveChatHub();
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["tickets"] });

    hub.on(HubEvents.TicketCreated, refresh);
    hub.on(HubEvents.SessionResolved, refresh);

    hub
      .start()
      .then(() => hub.invoke(HubMethods.JoinAdminRoom).catch(() => {}))
      .catch(() => {});

    return () => {
      hub.stop();
    };
  }, [queryClient]);

  // When on a child route (e.g. /admin/tickets/$ticketId), render the child.
  // Must come after all hooks so hook order stays stable across navigation.
  if (pathname.startsWith("/admin/tickets/")) {
    return <Outlet />;
  }

  // Distinct chat types present in the current data (covers manual "Other" values too).
  const chatTypes = Array.from(
    new Set(tickets.map((t) => t.chatType).filter((v): v is string => !!v)),
  ).sort();

  const list = tickets
    .filter(
      (t) =>
        q === "" ||
        t.subject.toLowerCase().includes(q.toLowerCase()) ||
        t.id.toLowerCase().includes(q.toLowerCase()),
    )
    .filter((t) => typeFilter === "" || t.chatType === typeFilter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="text-sm text-muted-foreground">Triage and resolve customer issues.</p>
      </div>

      <GlassCard className="p-0">
        <div className="flex items-center gap-2 border-b border-border/60 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by id or subject…"
              className="h-9 pl-9 bg-background/40"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-background/40 px-2 text-sm outline-none"
            aria-label="Filter by chat type"
          >
            <option value="">All chat types</option>
            {chatTypes.map((ct) => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3 font-medium">ID</th>
                <th className="p-3 font-medium">Subject</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Assigned</th>
                <th className="p-3 font-medium">Priority</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Rating</th>
                <th className="p-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                list.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate({ to: "/admin/tickets/$ticketId", params: { ticketId: t.id } })}
                    className="border-b border-border/40 cursor-pointer transition hover:bg-accent/40"
                  >
                    <td className="p-3">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {t.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{t.subject}</p>
                      <p className="text-[11px] text-muted-foreground">{t.reference}</p>
                    </td>
                    <td className="p-3 text-xs">{t.customerName}</td>
                    <td className="p-3 text-xs">
                      {t.assignedAgent?.name ?? (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                          priorityTone[t.priority] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {t.priority.toLowerCase()}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                            statusTone[t.status] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {t.status.replace(/_/g, " ").toLowerCase()}
                        </span>
                        {t.slaBreach && (
                          <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                            SLA
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <TypeBadge chatType={t.chatType} />
                    </td>
                    <td className="p-3">
                      <RatingBadge rating={t.customerRating} />
                    </td>
                    <td className="p-3 text-[11px] text-muted-foreground">
                      {formatDate(t.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
