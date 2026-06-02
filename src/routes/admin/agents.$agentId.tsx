import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { Button } from "@/components/ui/button";
import { agentsService } from "@/services/agentsService";
import { ticketsService } from "@/services/ticketsService";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/agents/$agentId")({
  head: ({ params }) => ({
    meta: [
      { title: `Agent ${params.agentId} — Helix` },
      { name: "description", content: "Agent profile, workload and recent activity." },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const agent = await agentsService.getById(params.agentId);
      return { agent };
    } catch {
      throw notFound();
    }
  },
  notFoundComponent: () => (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Agent not found</h1>
      <p className="text-sm text-muted-foreground">This agent doesn't exist or was removed.</p>
      <Button asChild variant="outline">
        <Link to="/admin/agents">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to agents
        </Link>
      </Button>
    </div>
  ),
  component: AgentDetailPage,
});

const statusDot: Record<string, string> = {
  online: "bg-primary",
  busy: "bg-warning",
  away: "bg-accent-amber",
  offline: "bg-muted-foreground",
};
const statusPill: Record<string, string> = {
  online: "bg-primary/15 text-primary",
  busy: "bg-warning/15 text-warning",
  away: "bg-accent-amber/15 text-accent-amber",
  offline: "bg-muted text-muted-foreground",
};
const priorityTone: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-accent-rose/15 text-accent-rose",
  medium: "bg-accent-amber/15 text-accent-amber",
  low: "bg-accent-blue/15 text-accent-blue",
};

function AgentDetailPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { agent } = (Route.useLoaderData() ?? {}) as any;
  const statusKey = (agent?.status ?? "offline").toLowerCase();

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["tickets", "agent", agent?.id],
    queryFn: () => ticketsService.getAll({ agentId: agent.id }),
    enabled: !!agent?.id,
    retry: 1,
    refetchInterval: 60_000,
  });

  if (!agent) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openTickets = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status.toLowerCase()),
  ).length;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/admin/agents" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Agents
        </Link>
        <span>/</span>
        <span className="text-foreground">{agent.name}</span>
      </div>

      {/* Profile card */}
      <GlassCard>
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative">
            {agent.avatarUrl ? (
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white shadow"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-base font-semibold text-primary-foreground">
                {agent.name
                  .split(" ")
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
            )}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ring-2 ring-card",
                statusDot[statusKey] ?? "bg-muted-foreground",
              )}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                  statusPill[statusKey] ?? "bg-muted text-muted-foreground",
                )}
              >
                {statusKey}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{agent.role}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {agent.email}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Status", value: statusKey },
          { label: "Role", value: agent.role },
          { label: "Active Chats", value: agent.activeChats ?? "—" },
          { label: "Open Tickets", value: ticketsLoading ? "…" : openTickets },
        ].map((k) => (
          <GlassCard key={k.label} className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold capitalize">{k.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Tickets table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 pb-3">
          <h2 className="text-sm font-semibold">Assigned Tickets</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead className="pl-4">ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  No tickets assigned.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((t) => (
                <TableRow key={t.id} className="border-border/40">
                  <TableCell className="pl-4 font-mono text-xs">{t.reference}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{t.subject}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        priorityTone[t.priority.toLowerCase()] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {t.priority}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4 text-xs capitalize text-muted-foreground">
                    {t.status.replace("_", " ")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </GlassCard>

      {/* Agent info */}
      <GlassCard>
        <h2 className="text-sm font-semibold mb-3">Agent Details</h2>
        <dl className="grid gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
          <div className="flex justify-between border-b border-dashed border-foreground/10 py-2">
            <dt className="text-muted-foreground">Agent ID</dt>
            <dd className="font-mono">{agent.id.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div className="flex justify-between border-b border-dashed border-foreground/10 py-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{agent.email}</dd>
          </div>
          <div className="flex justify-between border-b border-dashed border-foreground/10 py-2">
            <dt className="text-muted-foreground">Role</dt>
            <dd className="font-semibold">{agent.role}</dd>
          </div>
          <div className="flex justify-between border-b border-dashed border-foreground/10 py-2">
            <dt className="text-muted-foreground">Last seen</dt>
            <dd>
              {agent.lastSeenAt
                ? new Date(agent.lastSeenAt).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </dd>
          </div>
        </dl>
      </GlassCard>
    </div>
  );
}
