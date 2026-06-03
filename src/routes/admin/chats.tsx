import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Lock,
  Megaphone,
  Globe,
  Activity,
  Send,
  AlertTriangle,
  ShieldAlert,
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
import type * as signalR from "@microsoft/signalr";

export const Route = createFileRoute("/admin/chats")({
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
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () => liveChatService.getActiveSessions(),
    retry: 1,
    refetchInterval: 30_000,
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
  const [typingActor, setTypingActor] = useState<"agent" | "customer" | null>(null);
  // tick forces a re-render every second so durations stay live
  const [, setTick] = useState(0);
  const hubRef = useRef<signalR.HubConnection | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while the supervisor is typing in the barge composer. The server
  // broadcasts AgentTyping to the whole session (caller included), so we use
  // this to ignore our own echoed typing event in the admin transcript.
  const selfTypingRef = useRef(false);
  const selfStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      // A delivered message clears the matching typing indicator.
      setTypingActor(null);
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

    // Typing indicators (admin observes both sides). Auto-clear after 4s so a
    // dropped "stopped" event can't leave the dots stuck on.
    const flagTyping = (who: "agent" | "customer") => {
      setTypingActor(who);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setTypingActor(null), 4000);
    };
    hub.on(HubEvents.AgentTyping, () => {
      // Suppress the echo of our own supervisor typing.
      if (selfTypingRef.current) return;
      flagTyping("agent");
    });
    hub.on(HubEvents.AgentStoppedTyping, () => setTypingActor(null));
    hub.on(HubEvents.CustomerTyping, () => flagTyping("customer"));
    hub.on(HubEvents.CustomerStoppedTyping, () => setTypingActor(null));

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
    setTypingActor(null);
    setMessagesLoading(true);
    liveChatService
      .getSession(activeId)
      .then((detail) => setMessages(detail.messages))
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }, [activeId]);

  // Join the open session's SignalR group so the admin receives live messages
  // and typing while merely viewing (not just after Barge-in). Groups are
  // per-connection, so re-run on every (re)connect and when switching chats.
  useEffect(() => {
    if (!activeId || hubStatus !== "connected") return;
    hubRef.current?.invoke(HubMethods.RejoinSession, activeId).catch(() => {});
  }, [activeId, hubStatus]);

  // Scroll to bottom when messages change
  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const isBarged = activeId ? !!barged[activeId] : false;
  const publicMessages = messages.filter((m) => !m.isWhisper);
  const whisperMessages = messages.filter((m) => m.isWhisper);

  const handleWhisper = async () => {
    if (!whisper.trim() || !activeId || !active) return;
    if (!active.agentId) {
      toast.error("No agent assigned to whisper to.");
      return;
    }
    try {
      await hubRef.current?.invoke(
        HubMethods.WhisperToAgent,
        activeId,
        active.agentId,
        whisper.trim(),
      );
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

  // Broadcast supervisor typing during a barge so the customer's widget shows
  // the typing indicator (the customer already listens for AgentTyping). We set
  // selfTypingRef so the echoed AgentTyping event doesn't light up our own view.
  const emitSupervisorStopTyping = () => {
    if (!activeId || !selfTypingRef.current) return;
    selfTypingRef.current = false;
    hubRef.current?.invoke(HubMethods.AgentStoppedTyping, activeId).catch(() => {});
  };

  const emitSupervisorTyping = () => {
    if (!activeId) return;
    selfTypingRef.current = true;
    hubRef.current?.invoke(HubMethods.AgentTyping, activeId).catch(() => {});
    if (selfStopTimerRef.current) clearTimeout(selfStopTimerRef.current);
    selfStopTimerRef.current = setTimeout(emitSupervisorStopTyping, 2000);
  };

  const handleSend = async () => {
    if (!reply.trim() || !activeId) return;
    try {
      if (selfStopTimerRef.current) clearTimeout(selfStopTimerRef.current);
      emitSupervisorStopTyping();
      await hubRef.current?.invoke(HubMethods.SupervisorSendMessage, activeId, reply.trim());
      setReply("");
    } catch {
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-110px)]">
      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[minmax(200px,248px)_minmax(0,1fr)_minmax(216px,300px)]">
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
                    {publicMessages.map((m, i) => {
                      const fromCustomer = m.senderType.toLowerCase() === "customer";
                      // Supervisor replies arrive as senderType "Agent" / senderName
                      // "Supervisor" — give them a violet bubble distinct from the
                      // agent's green so it's clear who said what.
                      const isSupervisor = !fromCustomer && m.senderName === "Supervisor";
                      return (
                        <div
                          key={i}
                          className={cn("flex", fromCustomer ? "justify-start" : "justify-end")}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                              fromCustomer
                                ? "border border-border bg-background/60"
                                : isSupervisor
                                  ? "bg-gradient-to-br from-violet-500 to-violet-600 text-white"
                                  : "gradient-primary text-primary-foreground",
                            )}
                          >
                            <p>{m.content}</p>
                            <p
                              className={cn(
                                "mt-1 text-[10px]",
                                fromCustomer ? "text-muted-foreground" : "text-white/70",
                              )}
                            >
                              {isSupervisor ? "Supervisor" : m.senderName} · {formatTs(m.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
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
                    {typingActor && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-background/60 px-3.5 py-2.5">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
                          <span className="ml-1 text-[11px] text-muted-foreground">
                            {typingActor === "customer"
                              ? active.customerName
                              : (active.agentName ?? "Agent")}{" "}
                            is typing…
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-border/60 p-4">
                {!isBarged ? (
                  <>
                    <div className="rounded-2xl border border-dashed border-violet-400/60 bg-violet-500/5 p-2 focus-within:border-violet-500">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          value={whisper}
                          onChange={(e) => setWhisper(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleWhisper();
                          }}
                          placeholder={`Send a private tip to ${active.agentName ?? "agent"}…`}
                          className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          onClick={handleWhisper}
                          className="h-9 flex-1 bg-violet-600 text-white hover:bg-violet-700"
                        >
                          <Megaphone className="mr-1 h-3.5 w-3.5" /> Whisper
                        </Button>
                        <Button variant="destructive" onClick={handleBarge} className="h-9 flex-1">
                          <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Barge in
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1.5 flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
                      <Lock className="h-3 w-3" /> Whispers are visible only to{" "}
                      {active.agentName ?? "the agent"}. The customer never sees them.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-rose-400/60 bg-background/60 p-2 focus-within:border-rose-500">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                        <input
                          value={reply}
                          onChange={(e) => {
                            setReply(e.target.value);
                            if (e.target.value) emitSupervisorTyping();
                            else emitSupervisorStopTyping();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSend();
                          }}
                          placeholder={`Reply as supervisor to ${active.customerName}…`}
                          className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <Button
                          onClick={handleSend}
                          className="h-9 shrink-0 gradient-primary text-primary-foreground"
                        >
                          <Send className="mr-1 h-3.5 w-3.5" /> Send
                        </Button>
                      </div>
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
