import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { Button } from "@/components/ui/button";
import { agents, conversations, tickets, activity, sessionsSeries } from "@/lib/admin-mock/data";
import { ArrowLeft, MessageSquare, Edit, UserCog, Flag, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export const Route = createFileRoute("/admin/agents/$agentId")({
  head: ({ params }) => {
    const a = agents.find((x) => x.id === params.agentId);
    return {
      meta: [
        { title: a ? `${a.name} — Agent` : "Agent — Helix" },
        { name: "description", content: "Agent profile, workload and recent activity." },
      ],
    };
  },
  loader: ({ params }) => {
    const agent = agents.find((a) => a.id === params.agentId);
    if (!agent) throw notFound();
    return { agent };
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
  const { agent } = Route.useLoaderData();

  const agentConvos = conversations.filter((c) => c.agent.name === agent.name);
  const agentTickets = tickets.filter((t) => t.agent === agent.name);
  const agentActivity = activity.filter((a) => a.who === agent.name);
  const resolvedToday = agentTickets.filter((t) => t.status === "resolved").length;
  const avgResponse = agentConvos[0]?.agent.avgResponse ?? "—";
  

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/admin/agents" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Agents
        </Link>
        <span>/</span>
        <span className="text-foreground">{agent.name}</span>
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-base font-semibold text-primary-foreground">
              {agent.avatar}
            </span>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ring-2 ring-card",
                statusDot[agent.status],
              )}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                  statusPill[agent.status],
                )}
              >
                {agent.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {agent.role} • {agent.shift} shift
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {agent.name.toLowerCase().replace(/[^a-z]/g, ".")}@helix.io
              </span>
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> +1 (555) 0{agent.id.replace(/\D/g, "")}-2847
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4" /> Message
            </Button>
            <Button variant="outline" size="sm">
              <UserCog className="h-4 w-4" /> Reassign
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive">
              <Flag className="h-4 w-4" /> Flag
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Chats", value: agent.chats },
          { label: "CSAT", value: agent.csat ? `${agent.csat}%` : "—" },
          { label: "Avg Response", value: avgResponse },
          { label: "Resolved Today", value: resolvedToday },
        ].map((k) => (
          <GlassCard key={k.label} className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold">{k.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Body */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Active Conversations</h2>
              <span className="text-xs text-muted-foreground">{agentConvos.length}</span>
            </div>
            {agentConvos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No active conversations.</p>
            ) : (
              <div className="space-y-2">
                {agentConvos.map((c) => (
                  <Link
                    key={c.id}
                    to="/admin/chats"
                    className="flex items-center gap-3 rounded-xl bg-background/40 p-3 hover:bg-background/60 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.customer} <span className="text-muted-foreground font-normal">• {c.company}</span></p>
                      <p className="text-xs text-muted-foreground truncate">{c.preview}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-muted-foreground">{c.channel}</p>
                      <p className="text-xs">{c.ts}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-0 overflow-hidden">
            <div className="p-4 pb-3">
              <h2 className="text-sm font-semibold">Recent Tickets</h2>
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
                {agentTickets.map((t) => (
                  <TableRow key={t.id} className="border-border/40">
                    <TableCell className="pl-4 font-mono text-xs">{t.id}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{t.subject}</TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", priorityTone[t.priority])}>{t.priority}</span>
                    </TableCell>
                    <TableCell className="pr-4 text-xs capitalize text-muted-foreground">{t.status.replace("_", " ")}</TableCell>
                  </TableRow>
                ))}
                {agentTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                      No tickets assigned.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <h2 className="text-sm font-semibold mb-3">Weekly Performance</h2>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sessionsSeries}>
                  <defs>
                    <linearGradient id="agentPerf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="resolved" stroke="var(--primary)" fill="url(#agentPerf)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="text-sm font-semibold mb-3">Recent Activity</h2>
            {agentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity.</p>
            ) : (
              <ul className="space-y-2">
                {agentActivity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div className="flex-1">
                      <p>
                        <span className="font-medium">{a.who}</span>{" "}
                        <span className="text-muted-foreground">{a.what}</span>{" "}
                        <span className="font-medium">{a.target}</span>
                      </p>
                      <p className="text-muted-foreground">{a.ts} ago</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
