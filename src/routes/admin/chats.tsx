import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  Lock,
  Megaphone,
  Globe,
  Activity,
  Send,
  AlertTriangle,
  ShieldAlert,
  PhoneOff,
  Smile,
  Loader2,
  Package,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  liveChatService,
  createLiveChatHub,
  HubEvents,
  HubMethods,
  type ChatMessage,
  type OrderSnapshot,
} from "@/services/liveChatService";
import { OrderDetails } from "@/components/order-details";
import { agentsService } from "@/services/agentsService";
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

const BARGED_KEY = "admin-barged-sessions";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🙂", "😊",
  "😉", "😍", "😎", "🤔", "👍", "👎", "👌", "🙏",
  "👏", "🙌", "💪", "🎉", "✅", "❌", "❤️", "🔥",
  "⭐", "💯", "😢", "😡", "🤝", "👋", "🚀", "💡",
];

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

function HealthTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "amber" | "rose";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        tone === "amber"
          ? "border-amber-400/50 bg-amber-500/10"
          : tone === "rose"
            ? "border-rose-400/50 bg-rose-500/10"
            : "border-border bg-background/40",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-semibold tabular-nums",
          tone === "amber"
            ? "text-amber-600 dark:text-amber-400"
            : tone === "rose"
              ? "text-rose-600 dark:text-rose-400"
              : "",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ChatsPage() {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["admin-sessions"],
    queryFn: () => liveChatService.getActiveSessions(),
    retry: 1,
    refetchInterval: 30_000,
  });

  // Team health: agents (for status) + the live queue (for waiting customers).
  const { data: allAgents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsService.getAll(),
    retry: 1,
    refetchInterval: 15_000,
  });

  const { data: liveQueue = [] } = useQuery({
    queryKey: ["live-queue"],
    queryFn: () => liveChatService.getQueue(),
    retry: 1,
    refetchInterval: 15_000,
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [whisper, setWhisper] = useState("");
  const [reply, setReply] = useState("");
  // Persist barged sessions so the supervisor composer survives a page refresh.
  const [barged, setBarged] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(BARGED_KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  const [bargeConfirmOpen, setBargeConfirmOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [hubStatus, setHubStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting",
  );
  const [typingActor, setTypingActor] = useState<"agent" | "customer" | null>(null);
  // tick forces a re-render every second so durations stay live
  const [, setTick] = useState(0);
  const hubRef = useRef<signalR.HubConnection | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirror the open session id so the (once-registered) SignalR handlers route
  // messages to the right chat — the admin connection is in multiple session groups.
  const activeIdRef = useRef<string | null>(null);
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
    hub.onreconnected(() => {
      setHubStatus("connected");
      // Reconnect gets a new connection ID — re-join the admins group and any
      // barged session groups so messages keep flowing without a page refresh.
      hub.invoke(HubMethods.JoinAdminRoom).catch(() => {});
      try {
        const bargedMap: Record<string, boolean> = JSON.parse(
          localStorage.getItem(BARGED_KEY) ?? "{}"
        );
        Object.keys(bargedMap).forEach((id) =>
          hub.invoke(HubMethods.RejoinSession, id).catch(() => {})
        );
      } catch {}
    });
    hub.onclose(() => setHubStatus("disconnected"));

    hub.on(HubEvents.MessageReceived, (msg: ChatMessage) => {
      // The admin connection is in every session group it has viewed, so this
      // fires for multiple chats. Only apply messages for the OPEN session.
      if (msg.sessionId && msg.sessionId !== activeIdRef.current) return;
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

    // Refresh sessions, queue and agent roster together so the health strip
    // stays live (waiting count, idle agents, etc.).
    const refreshOps = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["live-queue"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    };
    hub.on(HubEvents.QueueUpdated, refreshOps);
    hub.on(HubEvents.SessionAssigned, refreshOps);
    hub.on(HubEvents.SessionResolved, refreshOps);
    hub.on(HubEvents.AgentStatusChanged, () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
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

  // Keep the open-session ref in sync for the SignalR message router.
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

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
  const orderInfo = useMemo<OrderSnapshot | null>(() => {
    if (!active?.orderSnapshot) return null;
    try {
      return JSON.parse(active.orderSnapshot) as OrderSnapshot;
    } catch {
      return null;
    }
  }, [active?.orderSnapshot]);
  const publicMessages = messages.filter((m) => !m.isWhisper);
  const whisperMessages = messages.filter((m) => m.isWhisper);
  // Barged if persisted locally, OR if the transcript already contains a
  // supervisor message — the latter survives a refresh even on another device.
  const isBarged = activeId
    ? !!barged[activeId] || publicMessages.some((m) => m.senderName === "Supervisor")
    : false;

  // ── Team health (manager oversight) ────────────────────────────────────────
  const handlingIds = new Set(sessions.map((s) => s.agentId).filter(Boolean));
  // Number of live conversations (what "In chats" should reflect).
  const activeChats = sessions.length;
  // Agents present & working — Online (available) OR Busy (in a chat). An agent
  // handling chats is "Busy" but is still online, so both count here.
  const onlineCount = allAgents.filter((a) =>
    ["online", "busy"].includes(a.status.toLowerCase()),
  ).length;
  // Available but handling no chat → spare capacity / the "slacking" signal.
  const idleAgents = allAgents.filter(
    (a) => a.status.toLowerCase() === "online" && !handlingIds.has(a.id),
  );
  const waiting = liveQueue.length;
  const longestWaitMin = liveQueue.reduce((max, q) => {
    const m = Math.floor((Date.now() - new Date(q.queuedAt).getTime()) / 60000);
    return Math.max(max, m);
  }, 0);
  // Customers waiting beyond the SLA threshold (matches the backend alert).
  const QUEUE_SLA_MIN = 5;
  const slaBreaches = liveQueue.filter(
    (q) => (Date.now() - new Date(q.queuedAt).getTime()) / 60000 > QUEUE_SLA_MIN,
  ).length;
  // Active chats the agent hasn't replied to beyond the threshold (neglected).
  const STALLED_MIN = 5;
  const stalledSessions = sessions.filter((s) => (s.awaitingReplyMins ?? 0) >= STALLED_MIN);
  // Dormant active chats — no message from anyone for a while (nudge to wrap up).
  const INACTIVE_MIN = 2;
  const inactiveSessions = sessions.filter((s) => (s.lastActivityMins ?? 0) >= INACTIVE_MIN);
  // The accountability signal: free agents while customers are waiting.
  const idleWhileWaiting = waiting > 0 ? idleAgents : [];

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

  const handleBarge = () => {
    if (!activeId || isBarged) return;
    setBargeConfirmOpen(true);
  };

  const confirmBarge = async () => {
    setBargeConfirmOpen(false);
    if (!activeId) return;
    try {
      await hubRef.current?.invoke(HubMethods.BargeIn, activeId);
      setBarged((b) => {
        const next = { ...b, [activeId]: true };
        try {
          localStorage.setItem(BARGED_KEY, JSON.stringify(next));
        } catch {
          /* ignore quota / privacy-mode errors */
        }
        return next;
      });
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

  const confirmEndChat = async () => {
    setEndConfirmOpen(false);
    if (!activeId) return;
    const endedId = activeId;
    try {
      await hubRef.current?.invoke(HubMethods.EndChat, endedId);
      // Clear the persisted barged flag for this session.
      setBarged((b) => {
        const next = { ...b };
        delete next[endedId];
        try {
          localStorage.setItem(BARGED_KEY, JSON.stringify(next));
        } catch {
          /* ignore quota / privacy-mode errors */
        }
        return next;
      });
      toast.success(`Chat with ${active?.customerName ?? "customer"} ended`);
      queryClient.invalidateQueries({ queryKey: ["admin-sessions"] });
    } catch {
      toast.error("Failed to end chat");
    }
  };

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-110px)]">
      {/* === Team health strip (manager oversight) === */}
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <HealthTile label="Waiting" value={waiting} tone={waiting > 0 ? "amber" : "default"} />
        <HealthTile
          label="Longest wait"
          value={`${longestWaitMin}m`}
          tone={longestWaitMin > QUEUE_SLA_MIN ? "rose" : "default"}
        />
        <HealthTile
          label="SLA breaches"
          value={slaBreaches}
          tone={slaBreaches > 0 ? "rose" : "default"}
        />
        <HealthTile
          label="Awaiting reply"
          value={stalledSessions.length}
          tone={stalledSessions.length > 0 ? "rose" : "default"}
        />
        <HealthTile
          label="Inactive"
          value={inactiveSessions.length}
          tone={inactiveSessions.length > 0 ? "amber" : "default"}
        />
        <HealthTile label="Online" value={onlineCount} />
        <HealthTile label="Active chats" value={activeChats} />
        <HealthTile
          label="Idle"
          value={idleAgents.length}
          tone={idleWhileWaiting.length > 0 ? "rose" : "default"}
        />
      </div>
      {idleWhileWaiting.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>
              {idleWhileWaiting.length} agent{idleWhileWaiting.length > 1 ? "s" : ""} free
            </strong>{" "}
            while {waiting} customer{waiting > 1 ? "s" : ""} waiting —{" "}
            {idleWhileWaiting.map((a) => a.name).join(", ")}
          </span>
        </div>
      )}
      {stalledSessions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>
              {stalledSessions.length} chat{stalledSessions.length > 1 ? "s" : ""} awaiting a reply
            </strong>{" "}
            (no agent response in {STALLED_MIN}m+) —{" "}
            {stalledSessions
              .map((s) => `${s.customerName} / ${s.agentName ?? "unassigned"}`)
              .join(", ")}
          </span>
        </div>
      )}
      {inactiveSessions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>
              {inactiveSessions.length} dormant chat{inactiveSessions.length > 1 ? "s" : ""}
            </strong>{" "}
            (no activity in {INACTIVE_MIN}m+) —{" "}
            {inactiveSessions
              .map((s) => `${s.customerName} / ${s.agentName ?? "unassigned"}`)
              .join(", ")}
          </span>
        </div>
      )}

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
                        <div className="relative shrink-0">
                          {showEmoji && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowEmoji(false)}
                              />
                              <div className="absolute bottom-11 right-0 z-20 grid w-56 grid-cols-8 gap-0.5 rounded-2xl border border-border bg-popover p-2 shadow-lg">
                                {EMOJIS.map((e) => (
                                  <button
                                    key={e}
                                    type="button"
                                    onClick={() => {
                                      setReply((r) => r + e);
                                      setShowEmoji(false);
                                    }}
                                    className="grid h-6 w-6 place-items-center rounded-lg text-base hover:bg-muted/60"
                                  >
                                    {e}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowEmoji((v) => !v)}
                            className="grid h-9 w-9 place-items-center rounded-xl text-foreground/60 hover:bg-muted/60"
                          >
                            <Smile className="h-4 w-4" />
                          </button>
                        </div>
                        <Button
                          onClick={handleSend}
                          className="h-9 shrink-0 gradient-primary text-primary-foreground"
                        >
                          <Send className="mr-1 h-3.5 w-3.5" /> Send
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEndConfirmOpen(true)}
                          className="h-9 shrink-0 border-rose-400/60 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        >
                          <PhoneOff className="mr-1 h-3.5 w-3.5" /> End chat
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

              {/* Order details */}
              <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Package className="h-3 w-3" /> Order details
                </p>
                <div className="mt-2.5">
                  <OrderDetails order={orderInfo} fallbackReference={active.reference} />
                </div>
              </div>

              {/* Agent + session status (compact) */}
              <div className="mt-3 rounded-xl border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Handled by</span>
                  <span className="text-xs font-semibold">
                    {active.agentName ?? "Unassigned"}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Status</span>
                  <span className="text-xs font-medium capitalize">{active.status}</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Accepted</span>
                  <span className="text-xs">
                    {active.acceptedAt ? formatTs(active.acceptedAt) : "—"}
                  </span>
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

      <AlertDialog open={bargeConfirmOpen} onOpenChange={setBargeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <AlertDialogTitle>Take over this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll start replying directly to{" "}
              <span className="font-medium text-foreground">{active?.customerName}</span>. The
              customer will be notified that a supervisor has joined, and your messages will be
              visible to them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBarge}
              className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500"
            >
              <ShieldAlert className="mr-1.5 h-4 w-4" /> Barge in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <PhoneOff className="h-5 w-5" />
            </div>
            <AlertDialogTitle>End this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end the live session with{" "}
              <span className="font-medium text-foreground">{active?.customerName}</span>. The
              customer will be asked to rate their experience, and a ticket will be created from the
              transcript. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEndChat}
              className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500"
            >
              <PhoneOff className="mr-1.5 h-4 w-4" /> End chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
