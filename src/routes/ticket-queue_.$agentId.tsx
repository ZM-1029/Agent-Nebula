import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { agentsService } from "@/services/agentsService";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquareText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ticket-queue_/$agentId")({
  head: ({ params }) => ({
    meta: [
      { title: `Agent ${params.agentId} — Session Queue` },
      { name: "description", content: "Agent session queue details." },
    ],
  }),
  component: AgentDetail,
  notFoundComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">Agent not found.</p>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <p className="text-sm text-destructive">{String(error)}</p>
    </AppShell>
  ),
});

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusDotClass(status: string) {
  const s = status.toLowerCase();
  return s === "online"
    ? "bg-emerald-500"
    : s === "busy"
      ? "bg-amber-500"
      : s === "away"
        ? "bg-amber-400"
        : "bg-muted-foreground/40";
}

function AgentDetail() {
  const { agentId } = Route.useParams();
  const router = useRouter();

  const {
    data: agent,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["agents", agentId],
    queryFn: () => agentsService.getById(agentId),
    retry: 1,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (isError || !agent) {
    return (
      <AppShell>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agent not found</h1>
          <Link to="/ticket-queue" className="text-sm text-brand hover:underline">
            Back
          </Link>
        </div>
      </AppShell>
    );
  }

  const statusLower = agent.status.toLowerCase();

  const stats: { label: string; value: string | number }[] = [
    { label: "Status", value: agent.status },
    { label: "Role", value: agent.role },
    { label: "Active chats", value: agent.activeChats ?? "—" },
    {
      label: "Last seen",
      value: agent.lastSeenAt
        ? new Date(agent.lastSeenAt).toLocaleString([], {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "—",
    },
  ];

  return (
    <AppShell>
      <button
        onClick={() => router.history.back()}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to queue
      </button>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative">
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.2)]"
            />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-xl font-semibold text-primary ring-2 ring-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.2)]">
              {initials(agent.name)}
            </span>
          )}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white",
              statusDotClass(agent.status),
            )}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
          <p className="text-sm text-muted-foreground">{agent.email}</p>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
            {statusLower} · {agent.role}
          </p>
        </div>
        <Link
          to="/live-chats"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(87,184,92,0.9)] transition hover:brightness-105"
        >
          <MessageSquareText className="h-4 w-4" />
          Start chat
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <GlassCard key={s.label} className="p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">{s.value}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-6 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Overview
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-dashed border-foreground/10 py-2">
            <dt className="text-muted-foreground">Agent ID</dt>
            <dd className="font-mono text-xs">{agent.id.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div className="flex justify-between border-b border-dashed border-foreground/10 py-2">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-semibold">{agent.name}</dd>
          </div>
          <div className="flex justify-between border-b border-dashed border-foreground/10 py-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd>{agent.email}</dd>
          </div>
          <div className="flex justify-between border-b border-dashed border-foreground/10 py-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="capitalize">{statusLower}</dd>
          </div>
        </dl>
      </GlassCard>
    </AppShell>
  );
}
