import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { conversations, messageThread, whispers, supervisorActivity, agents } from "@/lib/admin-mock/data";
import { Button } from "@/components/ui/button";
import {
  Eye, Lock, Megaphone, Flag, UserCog, Globe, MessageCircle,
  Smartphone, Activity, Send, AlertTriangle, ShieldAlert, UserCircle2, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/chats")({
  validateSearch: (search: Record<string, unknown>) => ({
    agent: typeof search.agent === "string" ? search.agent : undefined,
  }),
  head: () => ({ meta: [{ title: "Live Chats — Admin Console" }, { name: "description", content: "God-mode oversight of live agent conversations." }] }),
  component: ChatsPage,
});

const channelMeta: Record<string, { label: string; icon: typeof Globe }> = {
  web: { label: "Web", icon: Globe },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  "in-app": { label: "In-App", icon: Smartphone },
};

const sentimentMeta: Record<string, { label: string; dot: string; bar: string; risk: number }> = {
  calm: { label: "Calm", dot: "bg-emerald-500", bar: "bg-emerald-500", risk: 20 },
  watch: { label: "Watch", dot: "bg-amber-500", bar: "bg-amber-500", risk: 60 },
  escalated: { label: "Escalated", dot: "bg-rose-500", bar: "bg-rose-500", risk: 92 },
};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}

function ChatsPage() {
  const { agent: agentParam } = Route.useSearch();
  const taggedAgent = agentParam ? agents.find((a) => a.id === agentParam) : undefined;

  if (taggedAgent) {
    return <AgentDirectMessage agent={taggedAgent} />;
  }

  const [activeId, setActiveId] = useState(conversations[0].id);
  const [channelFilter, setChannelFilter] = useState<"all" | "web" | "whatsapp" | "in-app">("all");
  const [whisper, setWhisper] = useState("");
  const [barged, setBarged] = useState<Record<string, boolean>>({});
  const [reply, setReply] = useState("");
  const [tick, setTick] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const active = conversations.find((c) => c.id === activeId)!;
  const isBarged = !!barged[activeId];

  const filtered = useMemo(
    () => conversations.filter((c) => channelFilter === "all" || c.channel === channelFilter),
    [channelFilter],
  );

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [activeId]);

  const activeWhispers = whispers[activeId] ?? [];
  const activeActivity = supervisorActivity[activeId] ?? [
    { id: 1, type: "viewing" as const, text: "You started viewing this session", ts: "now" },
  ];

  const sent = sentimentMeta[active.sentiment];
  const ChannelIcon = channelMeta[active.channel]?.icon ?? Globe;

  const handleBarge = () => {
    if (isBarged) return;
    if (!window.confirm("Take over this conversation? The customer will be notified that a supervisor has joined.")) return;
    setBarged((b) => ({ ...b, [activeId]: true }));
    toast.success(`You've taken over the chat with ${active.customer}`);
  };

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-110px)]">
      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[340px_1fr_320px]">
      {/* === Column 1: Live Feed === */}
      <GlassCard className="flex max-h-[40vh] flex-col overflow-hidden p-0 lg:max-h-none">
        <div className="border-b border-border/60 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <p className="text-sm font-semibold">Live Sessions</p>
            </div>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {conversations.length} active
            </span>
          </div>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
          {filtered.map((c) => {
            const CIcon = channelMeta[c.channel]?.icon ?? Globe;
            const s = sentimentMeta[c.sentiment];
            const isActive = activeId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "mb-1 flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition",
                  isActive ? "bg-primary/12 ring-1 ring-primary/30" : "hover:bg-accent/60",
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-[11px] font-semibold text-primary-foreground">
                  {c.customer.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold">{c.customer}</p>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                      {formatDuration(c.durationSec + tick)}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">{c.company}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[8px] font-bold text-primary">
                        {c.agent.avatar}
                      </span>
                      <span className="truncate text-[10px] text-muted-foreground">{c.agent.name}</span>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded bg-background/60 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      <CIcon className="h-2.5 w-2.5" /> {channelMeta[c.channel].label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* === Column 2: Sneak Peek + Whisper === */}
      <GlassCard className="flex max-h-[70vh] flex-col overflow-hidden p-0 lg:max-h-none">
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
              {active.customer.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </span>
            <div>
              <p className="text-sm font-semibold">{active.customer}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ChannelIcon className="h-3 w-3" />
                {channelMeta[active.channel].label}
                <span>•</span>
                <span className="tabular-nums">{formatDuration(active.durationSec + tick)}</span>
                <span>•</span>
                <span>Handled by {active.agent.name}</span>
              </p>
            </div>
          </div>
          {isBarged ? (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5" /> Supervisor active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <Eye className="h-3.5 w-3.5" /> Viewing live — customer cannot see you
            </span>
          )}
        </div>

        <div ref={transcriptRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
          {messageThread.map((m) => (
            <div key={m.id} className={cn("flex", m.from === "agent" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                  m.from === "agent"
                    ? "gradient-primary text-primary-foreground"
                    : "border border-border bg-background/60",
                )}
              >
                <p>{m.text}</p>
                <p className={cn("mt-1 text-[10px]", m.from === "agent" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {m.ts}
                </p>
              </div>
            </div>
          ))}

          {activeWhispers.map((w) => (
            <div key={`w-${w.id}`} className="flex justify-end">
              <div className="max-w-[70%] rounded-2xl border border-dashed border-violet-400/60 bg-violet-500/10 px-3.5 py-2 text-sm text-violet-700 dark:text-violet-300">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                  <Lock className="h-3 w-3" /> Whisper to {active.agent.name}
                </p>
                <p className="mt-1 italic">{w.text}</p>
                <p className="mt-1 text-[10px] opacity-70">{w.ts} · only {active.agent.name} sees this</p>
              </div>
            </div>
          ))}
        </div>

        {/* Composer: whisper by default, public reply once barged */}
        <div className="border-t border-border/60 p-4">
          {!isBarged ? (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-violet-400/60 bg-violet-500/5 p-2 focus-within:border-violet-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  value={whisper}
                  onChange={(e) => setWhisper(e.target.value)}
                  placeholder={`Send a private tip to ${active.agent.name}…`}
                  className="h-9 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  onClick={() => {
                    if (!whisper.trim()) return;
                    setWhisper("");
                    toast.success(`Whisper sent to ${active.agent.name}`);
                  }}
                  className="h-9 bg-violet-600 text-white hover:bg-violet-700"
                >
                  <Megaphone className="mr-1 h-3.5 w-3.5" /> Whisper
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBarge}
                  className="h-9"
                >
                  <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Barge in
                </Button>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                <Lock className="h-3 w-3" /> Whispers are visible only to {active.agent.name}. The customer never sees them.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-rose-400/60 bg-background/60 p-2 focus-within:border-rose-500">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Reply as supervisor to ${active.customer}…`}
                  className="h-9 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  onClick={() => {
                    if (!reply.trim()) return;
                    setReply("");
                    toast.success("Reply sent");
                  }}
                  className="h-9 gradient-primary text-primary-foreground"
                >
                  <Send className="mr-1 h-3.5 w-3.5" /> Send
                </Button>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3 w-3" /> You've taken over. Messages now go directly to the customer.
              </p>
            </>
          )}
        </div>
      </GlassCard>

      {/* === Column 3: Session Panel === */}
      <GlassCard className="scrollbar-thin overflow-y-auto">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-base font-semibold text-primary-foreground">
            {active.customer.split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </span>
          <p className="mt-2 text-sm font-semibold">{active.customer}</p>
          <p className="text-xs text-muted-foreground">{active.company}</p>
        </div>

        {/* Agent card */}
        <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned agent</p>
          <div className="mt-2 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {active.agent.avatar}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{active.agent.name}</p>
              <p className="text-[10px] text-muted-foreground">Online · {active.agent.load} active chats</p>
            </div>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-background/60 p-1.5">
              <p className="text-[9px] uppercase text-muted-foreground">Avg reply</p>
              <p className="text-xs font-semibold">{active.agent.avgResponse}</p>
            </div>
            <div className="rounded-lg bg-background/60 p-1.5">
              <p className="text-[9px] uppercase text-muted-foreground">Load</p>
              <p className="text-xs font-semibold">{active.agent.load}/5</p>
            </div>
          </div>
        </div>

        {/* Sentiment */}
        <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Escalation risk</p>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase",
              active.sentiment === "calm" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
              active.sentiment === "watch" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
              active.sentiment === "escalated" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
            )}>
              {sent.label}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/80">
            <div className={cn("h-full transition-all", sent.bar)} style={{ width: `${sent.risk}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
            <span>Calm</span><span>Escalated</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => toast.info("Focus the whisper box to send a tip.")}>
              <Megaphone className="mr-1 h-3 w-3" /> Whisper
            </Button>
            <Button variant="outline" size="sm" className="h-8 border-rose-400/60 text-[11px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400" onClick={handleBarge}>
              <ShieldAlert className="mr-1 h-3 w-3" /> Barge
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => toast.success("Reassignment opened")}>
              <UserCog className="mr-1 h-3 w-3" /> Reassign
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => toast.success("Flagged for review")}>
              <Flag className="mr-1 h-3 w-3" /> Flag
            </Button>
          </div>
        </div>

        {/* Activity log */}
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Activity className="h-3 w-3" /> Supervisor activity
          </p>
          <div className="mt-2 space-y-1.5">
            {activeActivity.map((a) => {
              const Icon =
                a.type === "viewing" ? Eye :
                a.type === "whisper" ? Megaphone :
                a.type === "barge" ? ShieldAlert : Flag;
              const tone =
                a.type === "viewing" ? "text-amber-600 dark:text-amber-400" :
                a.type === "whisper" ? "text-violet-600 dark:text-violet-400" :
                a.type === "barge" ? "text-rose-600 dark:text-rose-400" :
                "text-primary";
              return (
                <div key={a.id} className="flex items-start gap-2 rounded-lg bg-background/40 px-2 py-1.5">
                  <Icon className={cn("mt-0.5 h-3 w-3 shrink-0", tone)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] leading-tight">{a.text}</p>
                    <p className="text-[9px] text-muted-foreground">{a.ts}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>
      </div>
    </div>
  );
}

type AgentRecord = (typeof agents)[number];

function AgentDirectMessage({ agent }: { agent: AgentRecord }) {
  const [thread, setThread] = useState<{ id: number; from: "admin" | "agent"; text: string; ts: string }[]>([
    { id: 1, from: "agent", text: `Hi! This is ${agent.name}. How can I help?`, ts: "9:02 AM" },
    { id: 2, from: "admin", text: "Quick check-in on your active queue — any blockers?", ts: "9:04 AM" },
    { id: 3, from: "agent", text: "All good. Working through the Acme escalation now.", ts: "9:05 AM" },
  ]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  const send = () => {
    if (!draft.trim()) return;
    setThread((t) => [
      ...t,
      { id: t.length + 1, from: "admin", text: draft.trim(), ts: "now" },
    ]);
    setDraft("");
    toast.success(`Message sent to ${agent.name}`);
  };

  const statusDot =
    agent.status === "online" ? "bg-emerald-500" :
    agent.status === "busy" ? "bg-amber-500" :
    agent.status === "away" ? "bg-amber-400" : "bg-muted-foreground";

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-110px)]">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-[11px] font-semibold text-primary-foreground">
            {agent.avatar}
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-primary/80 font-semibold flex items-center gap-1">
              <UserCircle2 className="h-3 w-3" /> Agent profile
            </p>
            <p className="text-sm font-semibold leading-tight">
              Messaging {agent.name}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">• {agent.role}</span>
            </p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/chats" search={{ agent: undefined }}>
            <X className="h-3.5 w-3.5" /> Clear
          </Link>
        </Button>
      </div>

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1fr_320px]">
        <GlassCard className="flex max-h-[70vh] flex-col overflow-hidden p-0 lg:max-h-none">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                {agent.avatar}
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", statusDot)} />
              </span>
              <div>
                <p className="text-sm font-semibold">{agent.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{agent.status} · {agent.role}</p>
              </div>
            </div>
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">
              Direct message
            </span>
          </div>

          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
            {thread.map((m) => (
              <div key={m.id} className={cn("flex", m.from === "admin" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                    m.from === "admin"
                      ? "gradient-primary text-primary-foreground"
                      : "border border-border bg-background/60",
                  )}
                >
                  <p>{m.text}</p>
                  <p className={cn("mt-1 text-[10px]", m.from === "admin" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.ts}
                  </p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border/60 p-4">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-2 focus-within:border-primary">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder={`Message ${agent.name}…`}
                className="h-9 flex-1 border-0 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button onClick={send} className="h-9 gradient-primary text-primary-foreground">
                <Send className="mr-1 h-3.5 w-3.5" /> Send
              </Button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
              Direct admin-to-agent chat. Customers do not see these messages.
            </p>
          </div>
        </GlassCard>

        <GlassCard className="scrollbar-thin overflow-y-auto">
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-base font-semibold text-primary-foreground">
              {agent.avatar}
            </span>
            <p className="mt-2 text-sm font-semibold">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[9px] uppercase text-muted-foreground">Status</p>
              <p className="text-xs font-semibold capitalize">{agent.status}</p>
            </div>
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[9px] uppercase text-muted-foreground">Shift</p>
              <p className="text-xs font-semibold">{agent.shift}</p>
            </div>
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[9px] uppercase text-muted-foreground">Active chats</p>
              <p className="text-xs font-semibold">{agent.chats}</p>
            </div>
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[9px] uppercase text-muted-foreground">CSAT</p>
              <p className="text-xs font-semibold">{agent.csat}%</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link to="/admin/agents/$agentId" params={{ agentId: agent.id }}>
              View full profile
            </Link>
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}
