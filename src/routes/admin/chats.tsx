import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Lock,
  Megaphone,
  Flag,
  UserCog,
  Globe,
  Activity,
  Send,
  AlertTriangle,
  ShieldAlert,
  UserCircle2,
  X,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  liveChatService,
  createLiveChatHub,
  HubEvents,
  HubMethods,
  type ChatMessage,
} from "@/services/liveChatService";
import { agentsService, type Agent } from "@/services/agentsService";
import type * as signalR from "@microsoft/signalr";

export const Route = createFileRoute("/admin/chats")({
  validateSearch: (search: Record<string, unknown>) => ({
    agent: typeof search.agent === "string" ? search.agent : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Live Chats — Admin Console" },
      { name: "description", content: "God-mode oversight of live agent conversations." },
    ],
  }),
  component: ChatsPage,
});

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDuration(startIso: string | null | undefined) {
  if (!startIso) return "0m 00s";
  const sec = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}

function formatTs(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function ChatsPage() {
  const { agent: agentParam } = Route.useSearch();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () => liveChatService.getActiveSessions(),
    retry: 1,
    refetchInterval: 30_000,
  });

  const { data: allAgents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsService.getAll(),
    retry: 1,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [whisper, setWhisper] = useState("");
  const [reply, setReply] = useState("");
  const [barged, setBarged] = useState<Record<string, boolean>>({});
  const [hubStatus, setHubStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting",
  );
  // tick forces a re-render every second so durations stay live
  const [, setTick] = useState(0);
  const hubRef = useRef<signalR.HubConnection | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // SignalR admin hub
  useEffect(() => {
    const hub = createLiveChatHub();
    hubRef.current = hub;

    hub.onreconnecting(() => setHubStatus("connecting"));
    hub.onreconnected(() => setHubStatus("connected"));
    hub.onclose(() => setHubStatus("disconnected"));

    hub.on(HubEvents.MessageReceived, (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.timestamp === msg.timestamp && m.content === msg.content))
          return prev;
        return [...prev, msg];
      });
      setTimeout(
        () =>
          transcriptRef.current?.scrollTo({
            top: transcriptRef.current.scrollHeight,
            behavior: "smooth",
          }),
        50,
      );
    });

    hub.on(HubEvents.QueueUpdated, () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
    });
    hub.on(HubEvents.SessionAssigned, () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
    });
    hub.on(HubEvents.SessionResolved, () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
    });

    hub
      .start()
      .then(() => {
        setHubStatus("connected");
        return hub.invoke(HubMethods.JoinAdminRoom);
      })
      .catch(() => setHubStatus("disconnected"));

    return () => {
      hub.stop();
    };
  }, [queryClient]);

  // Auto-select first session
  useEffect(() => {
    if (!activeId && sessions.length > 0) {
      setActiveId(sessions[0].id);
    }
  }, [sessions, activeId]);

  // Load messages when active session changes
  useEffect(() => {
    if (!activeId) return;
    setMessagesLoading(true);
    liveChatService
      .getSession(activeId)
      .then((detail) => setMessages(detail.messages))
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }, [activeId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Conditional render AFTER all hooks
  const taggedAgent = agentParam ? allAgents.find((a) => a.id === agentParam) : undefined;
  if (taggedAgent) {
    return <AgentDirectMessage agent={taggedAgent} />;
  }

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const isBarged = activeId ? !!barged[activeId] : false;
  const publicMessages = messages.filter((m) => !m.isWhisper);
  const whisperMessages = messages.filter((m) => m.isWhisper);

  const handleWhisper = async () => {
    if (!whisper.trim() || !activeId || !active) return;
    try {
      await hubRef.current?.invoke(HubMethods.WhisperToAgent, activeId, whisper.trim());
      setWhisper("");
      toast.success(`Whisper sent to ${active.agentName ?? "agent"}`);
    } catch {
      toast.error("Failed to send whisper");
    }
  };

  const handleBarge = async () => {
    if (!activeId || isBarged) return;
    if (
      !window.confirm(
        "Take over this conversation? The customer will be notified that a supervisor has joined.",
      )
    )
      return;
    try {
      await hubRef.current?.invoke(HubMethods.BargeIn, activeId);
      setBarged((b) => ({ ...b, [activeId]: true }));
      toast.success(`You've taken over the chat with ${active?.customerName}`);
    } catch {
      toast.error("Failed to barge in");
    }
  };

  const handleSend = async () => {
    if (!reply.trim() || !activeId) return;
    try {
      await hubRef.current?.invoke(HubMethods.AgentSendMessage, activeId, reply.trim());
      setReply("");
    } catch {
      toast.error("Failed to send message");
    }
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
                  <span
                    className={cn(
                      "absolute inline-flex h-full w-full rounded-full opacity-75",
                      hubStatus === "connected" ? "animate-ping bg-emerald-400" : "bg-amber-400",
                    )}
                  />
                  <span
                    className={cn(
                      "relative inline-flex h-2 w-2 rounded-full",
                      hubStatus === "connected"
                        ? "bg-emerald-500"
                        : hubStatus === "connecting"
                          ? "bg-amber-500"
                          : "bg-rose-500",
                    )}
                  />
                </span>
                <p className="text-sm font-semibold">Live Sessions</p>
              </div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {sessions.length} active
              </span>
            </div>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No active sessions</p>
            ) : (
              sessions.map((s) => {
                const isActive = activeId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "mb-1 flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition",
                      isActive ? "bg-primary/12 ring-1 ring-primary/30" : "hover:bg-accent/60",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full gradient-primary text-[11px] font-semibold text-primary-foreground">
                      {initials(s.customerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold">{s.customerName}</p>
                        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {formatDuration(s.acceptedAt ?? s.queuedAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        {s.agentName ? `Agent: ${s.agentName}` : "Unassigned"}
                      </p>
                      <div className="mt-1">
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize",
                            s.status.toLowerCase() === "active"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {s.status}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* === Column 2: Transcript + Composer === */}
        <GlassCard className="flex max-h-[70vh] flex-col overflow-hidden p-0 lg:max-h-none">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a session to view the transcript
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border/60 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                    {initials(active.customerName)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{active.customerName}</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      <span className="tabular-nums">
                        {formatDuration(active.acceptedAt ?? active.queuedAt)}
                      </span>
                      {active.agentName && (
                        <>
                          <span>•</span>
                          <span>Handled by {active.agentName}</span>
                        </>
                      )}
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

              <div
                ref={transcriptRef}
                className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4"
              >
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {publicMessages.map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          m.senderType.toLowerCase() === "agent" ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                            m.senderType.toLowerCase() === "agent"
                              ? "gradient-primary text-primary-foreground"
                              : "border border-border bg-background/60",
                          )}
                        >
                          <p>{m.content}</p>
                          <p
                            className={cn(
                              "mt-1 text-[10px]",
                              m.senderType.toLowerCase() === "agent"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatTs(m.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {whisperMessages.map((w, i) => (
                      <div key={`w-${i}`} className="flex justify-end">
                        <div className="max-w-[70%] rounded-2xl border border-dashed border-violet-400/60 bg-violet-500/10 px-3.5 py-2 text-sm text-violet-700 dark:text-violet-300">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                            <Lock className="h-3 w-3" /> Whisper to {active.agentName ?? "agent"}
                          </p>
                          <p className="mt-1 italic">{w.content}</p>
                          <p className="mt-1 text-[10px] opacity-70">
                            {formatTs(w.timestamp)} · only {active.agentName ?? "agent"} sees this
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Composer */}
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleWhisper();
                        }}
                        placeholder={`Send a private tip to ${active.agentName ?? "agent"}…`}
                        className="h-9 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <Button
                        onClick={handleWhisper}
                        className="h-9 bg-violet-600 text-white hover:bg-violet-700"
                      >
                        <Megaphone className="mr-1 h-3.5 w-3.5" /> Whisper
                      </Button>
                      <Button variant="destructive" onClick={handleBarge} className="h-9">
                        <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Barge in
                      </Button>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                      <Lock className="h-3 w-3" /> Whispers are visible only to{" "}
                      {active.agentName ?? "the agent"}. The customer never sees them.
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSend();
                        }}
                        placeholder={`Reply as supervisor to ${active.customerName}…`}
                        className="h-9 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                      <Button
                        onClick={handleSend}
                        className="h-9 gradient-primary text-primary-foreground"
                      >
                        <Send className="mr-1 h-3.5 w-3.5" /> Send
                      </Button>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-3 w-3" /> You've taken over. Messages now go
                      directly to the customer.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </GlassCard>

        {/* === Column 3: Session Panel === */}
        <GlassCard className="scrollbar-thin overflow-y-auto">
          {!active ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Select a session</p>
          ) : (
            <>
              <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-base font-semibold text-primary-foreground">
                  {initials(active.customerName)}
                </span>
                <p className="mt-2 text-sm font-semibold">{active.customerName}</p>
                <p className="text-xs text-muted-foreground">{active.reference}</p>
              </div>

              {/* Agent card */}
              <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned agent
                </p>
                {active.agentName ? (
                  <div className="mt-2 flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {initials(active.agentName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{active.agentName}</p>
                      <p className="text-[10px] text-muted-foreground">Active</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Unassigned</p>
                )}
              </div>

              {/* Session info */}
              <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Session info
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Queued</span>
                    <span>{formatTs(active.queuedAt)}</span>
                  </div>
                  {active.acceptedAt && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Accepted</span>
                      <span>{formatTs(active.acceptedAt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span className="capitalize">{active.status}</span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick actions
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px]"
                    onClick={() => toast.info("Focus the whisper box to send a tip.")}
                  >
                    <Megaphone className="mr-1 h-3 w-3" /> Whisper
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-rose-400/60 text-[11px] text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                    onClick={handleBarge}
                  >
                    <ShieldAlert className="mr-1 h-3 w-3" /> Barge
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px]"
                    onClick={() => toast.success("Reassignment opened")}
                  >
                    <UserCog className="mr-1 h-3 w-3" /> Reassign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px]"
                    onClick={() => toast.success("Flagged for review")}
                  >
                    <Flag className="mr-1 h-3 w-3" /> Flag
                  </Button>
                </div>
              </div>

              {/* Activity log (local) */}
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Activity className="h-3 w-3" /> Supervisor activity
                </p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-start gap-2 rounded-lg bg-background/40 px-2 py-1.5">
                    <Eye className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] leading-tight">You started viewing this session</p>
                      <p className="text-[9px] text-muted-foreground">now</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function AgentDirectMessage({ agent }: { agent: Agent }) {
  const [thread, setThread] = useState<
    { id: number; from: "admin" | "agent"; text: string; ts: string }[]
  >([
    { id: 1, from: "agent", text: `Hi! This is ${agent.name}. How can I help?`, ts: "9:02 AM" },
    {
      id: 2,
      from: "admin",
      text: "Quick check-in on your active queue — any blockers?",
      ts: "9:04 AM",
    },
    { id: 3, from: "agent", text: "All good. Working through the queue now.", ts: "9:05 AM" },
  ]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  const send = () => {
    if (!draft.trim()) return;
    setThread((t) => [...t, { id: t.length + 1, from: "admin", text: draft.trim(), ts: "now" }]);
    setDraft("");
    toast.success(`Message sent to ${agent.name}`);
  };

  const statusLower = agent.status.toLowerCase();
  const statusDot =
    statusLower === "online"
      ? "bg-emerald-500"
      : statusLower === "busy"
        ? "bg-amber-500"
        : statusLower === "away"
          ? "bg-amber-400"
          : "bg-muted-foreground";

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-110px)]">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-[11px] font-semibold text-primary-foreground">
            {initials(agent.name)}
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-primary/80 font-semibold flex items-center gap-1">
              <UserCircle2 className="h-3 w-3" /> Agent profile
            </p>
            <p className="text-sm font-semibold leading-tight">
              Messaging {agent.name}
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                • {agent.role}
              </span>
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
                {initials(agent.name)}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                    statusDot,
                  )}
                />
              </span>
              <div>
                <p className="text-sm font-semibold">{agent.name}</p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {statusLower} · {agent.role}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">
              Direct message
            </span>
          </div>

          <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
            {thread.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.from === "admin" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                    m.from === "admin"
                      ? "gradient-primary text-primary-foreground"
                      : "border border-border bg-background/60",
                  )}
                >
                  <p>{m.text}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      m.from === "admin" ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
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
              {initials(agent.name)}
            </span>
            <p className="mt-2 text-sm font-semibold">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[9px] uppercase text-muted-foreground">Status</p>
              <p className="text-xs font-semibold capitalize">{statusLower}</p>
            </div>
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[9px] uppercase text-muted-foreground">Active chats</p>
              <p className="text-xs font-semibold">{agent.activeChats ?? "—"}</p>
            </div>
            <div className="col-span-2 rounded-lg bg-background/60 p-2">
              <p className="text-[9px] uppercase text-muted-foreground">Last seen</p>
              <p className="text-xs font-semibold">
                {agent.lastSeenAt
                  ? new Date(agent.lastSeenAt).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "—"}
              </p>
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
