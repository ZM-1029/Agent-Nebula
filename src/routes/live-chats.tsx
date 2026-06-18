import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Smile,
  Send,
  FileText,
  ChevronDown,
  Search,
  Filter,
  ArrowLeft,
  User,
  Loader2,
  MessageSquare,
  CheckCircle2,
  ArrowRightLeft,
  Inbox,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  liveChatService,
  createLiveChatHub,
  HubEvents,
  HubMethods,
  type ActiveSession,
  type ChatMessage,
  type QueueItem,
  type OrderSnapshot,
} from "@/services/liveChatService";
import { OrderDetails } from "@/components/order-details";
import { agentsService, type Agent } from "@/services/agentsService";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useCannedReplies } from "@/lib/canned-replies";
import * as signalR from "@microsoft/signalr";

const AGENT_STATUSES = ["Online", "Busy", "Away", "Offline"] as const;
type AgentStatus = (typeof AGENT_STATUSES)[number];

// Common emojis for the composer picker.
const EMOJIS = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🙂", "😊",
  "😉", "😍", "😎", "🤔", "👍", "👎", "👌", "🙏",
  "👏", "🙌", "💪", "🎉", "✅", "❌", "❤️", "🔥",
  "⭐", "💯", "😢", "😡", "🤝", "👋", "🚀", "💡",
];

export const Route = createFileRoute("/live-chats")({
  head: () => ({
    meta: [
      { title: "Live Chats — Frankie" },
      {
        name: "description",
        content:
          "Active conversations with SLA timers, AI assist, and a futuristic customer profile drawer.",
      },
    ],
  }),
  component: LiveChats,
});

// ── Helpers ────────────────────────────────────────────────────────────────

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function slaMinutesFor(session: ActiveSession): number {
  // SLA target: 60 min from when the session was queued
  const SLA_MINUTES = 60;
  const ref = session.acceptedAt ?? session.queuedAt;
  const elapsed = Math.floor((Date.now() - new Date(ref).getTime()) / 60000);
  return Math.max(SLA_MINUTES - elapsed, 0);
}

/** Whole minutes a customer has been waiting since they joined the queue. */
function waitMinutesSince(iso: string): number {
  return Math.max(Math.floor((Date.now() - new Date(iso).getTime()) / 60000), 0);
}

function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Main component ─────────────────────────────────────────────────────────

function LiveChats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const agentId = user?.id ?? "";

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "chat" | "profile">("list");
  const [hubState, setHubState] = useState<"connecting" | "connected" | "disconnected">(
    "connecting",
  );
  const [agents, setAgents] = useState<Agent[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [myStatus, setMyStatus] = useState<AgentStatus>("Online");
  const [accepting, setAccepting] = useState(false);
  const [customerTyping, setCustomerTyping] = useState(false);

  const hubRef = useRef<signalR.HubConnection | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingActiveRef = useRef(false);
  const customerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic counter so out-of-order session fetches can't clobber newer data.
  const fetchSeqRef = useRef(0);
  // Current open chat id, mirrored into a ref so SignalR handlers (registered
  // once) always read the latest value and route messages to the right chat.
  const activeIdRef = useRef<string | null>(null);
  // Mirror of sessions kept in a ref so the onreconnected handler (registered
  // once at mount) can see the live list without a stale closure.
  const sessionsRef = useRef<ActiveSession[]>([]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  // ── Load sessions ────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    try {
      const data = agentId
        ? await liveChatService.getAgentSessions(agentId)
        : await liveChatService.getActiveSessions();
      // Drop this result if a newer fetch has since started (prevents a slow,
      // stale response from overwriting fresher session data).
      if (seq !== fetchSeqRef.current) return;
      setSessions(data);
      // Keep the open chat if it's still active; otherwise fall to the first
      // remaining one (or none). This makes an ended chat close on its own
      // instead of lingering until a manual refresh.
      setActiveId((prev) =>
        prev && data.some((s) => s.id === prev) ? prev : (data[0]?.id ?? null),
      );
    } catch {
      /* ignore — hub events will keep data fresh */
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // ── Load queue depth (for the Accept-next-chat control) ───────────────────
  const fetchQueue = useCallback(async () => {
    try {
      const q = await liveChatService.getQueue();
      setQueue(q);
    } catch {
      /* ignore — agent may not have queue read access */
    }
  }, []);

  // ── Load agent roster (for the Transfer picker) ──────────────────────────
  useEffect(() => {
    agentsService
      .getAll()
      .then(setAgents)
      .catch(() => {});
  }, []);

  // ── Load messages for the selected session ───────────────────────────────
  const fetchMessages = useCallback(async (sessionId: string) => {
    setMessagesLoading(true);
    try {
      const detail = await liveChatService.getSession(sessionId);
      setMessages(detail.messages);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    setCustomerTyping(false);
    if (activeId) fetchMessages(activeId);
  }, [activeId, fetchMessages]);

  // Join the open session's SignalR group so the customer's live messages arrive.
  // SignalR groups are per-connection, so this must re-run on every (re)connect
  // and whenever the agent opens a different chat — otherwise messages only show
  // after a manual refresh.
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    if (!activeId || hubState !== "connected") return;
    hubRef.current?.invoke(HubMethods.RejoinSession, activeId).catch(() => {});
  }, [activeId, hubState]);

  // ── SignalR hub ──────────────────────────────────────────────────────────
  useEffect(() => {
    const hub = createLiveChatHub();
    hubRef.current = hub;

    hub.on(HubEvents.MessageReceived, (msg: ChatMessage) => {
      // The agent's connection is in every session group they handle, so this
      // fires for ALL their chats. Only apply messages for the OPEN chat —
      // otherwise messages leak across conversations.
      if (msg.sessionId && msg.sessionId !== activeIdRef.current) return;
      // A new message means the customer is no longer mid-typing.
      if (msg.senderType?.toLowerCase() === "customer") setCustomerTyping(false);
      setMessages((prev) => {
        // avoid duplicates (SignalR may replay on reconnect)
        const already = prev.some(
          (m) =>
            m.senderName === msg.senderName &&
            m.content === msg.content &&
            m.timestamp === msg.timestamp,
        );
        return already ? prev : [...prev, msg];
      });
    });

    // Customer typing indicator. Auto-clear after 4s in case the
    // "stopped" event is dropped (e.g. customer closes the tab).
    hub.on(HubEvents.CustomerTyping, () => {
      setCustomerTyping(true);
      if (customerTypingTimerRef.current) clearTimeout(customerTypingTimerRef.current);
      customerTypingTimerRef.current = setTimeout(() => setCustomerTyping(false), 4000);
    });
    hub.on(HubEvents.CustomerStoppedTyping, () => {
      if (customerTypingTimerRef.current) clearTimeout(customerTypingTimerRef.current);
      setCustomerTyping(false);
    });

    hub.on(HubEvents.QueueUpdated, (snapshot?: unknown) => {
      if (Array.isArray(snapshot)) setQueue(snapshot as QueueItem[]);
      else fetchQueue();
      fetchSessions();
    });

    hub.on(HubEvents.SessionAssigned, () => {
      fetchSessions();
    });

    hub.on(HubEvents.SessionResolved, () => {
      fetchSessions();
    });

    // The customer (or a supervisor) ended a chat we're in. Refresh so the
    // resolved session drops out of our list and the open pane closes on its
    // own — no manual refresh needed.
    hub.on(HubEvents.ChatEnded, () => {
      toast.info("This chat was ended.");
      fetchSessions();
    });

    hub.on(HubEvents.QueueEmpty, () => {
      setQueue([]);
    });

    // Auto-assign pushed a chat to THIS agent — open it and prompt to respond.
    hub.on(
      HubEvents.ChatAutoAssigned,
      async (payload?: { sessionId?: string; customerName?: string }) => {
        toast.warning(
          `New chat assigned${payload?.customerName ? ` — ${payload.customerName}` : ""}. Please respond now.`,
        );
        await fetchSessions();
        if (payload?.sessionId) {
          setActiveId(payload.sessionId);
          setMobilePane("chat");
        }
      },
    );

    // Auto-assign reclaimed a chat we didn't respond to in time.
    hub.on(HubEvents.ChatReassigned, () => {
      toast.info("A chat was reassigned (no response in time).");
      fetchSessions();
    });

    // A chat was transferred to THIS agent.
    hub.on(HubEvents.ChatTransferred, (payload?: { agentName?: string }) => {
      toast.info(
        payload?.agentName
          ? `A chat was transferred to you (${payload.agentName}).`
          : "A chat was transferred to you.",
      );
      fetchSessions();
    });

    // Supervisor whisper — private note, shown only to this agent.
    hub.on(
      HubEvents.WhisperReceived,
      (payload?: { sessionId?: string; content?: string; timestamp?: string }) => {
        if (!payload?.content) return;
        toast("Supervisor whisper", { description: payload.content });
        // Only render into the open stream if the whisper is for THIS chat —
        // otherwise it would appear in whatever chat the agent currently has open.
        if (payload.sessionId && payload.sessionId !== activeIdRef.current) return;
        setMessages((prev) => [
          ...prev,
          {
            senderType: "Admin",
            senderName: "Supervisor",
            content: payload.content!,
            timestamp: payload.timestamp ?? new Date().toISOString(),
            isWhisper: true,
          },
        ]);
      },
    );

    // Keep our own status pill in sync when the server reports a change for us.
    hub.on(HubEvents.AgentStatusChanged, (changedAgentId?: string, status?: string) => {
      if (agentId && changedAgentId === agentId && status) {
        setMyStatus(status as AgentStatus);
        // Keep the profile dropdown (/api/auth/me) in sync with the selector.
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });

    hub.onreconnected(() => {
      setHubState("connected");
      fetchSessions();
      fetchQueue();
      if (agentId) {
        hub.invoke(HubMethods.AgentConnect, agentId).catch(() => {});
        // Reconnect gets a new connection ID — re-join all active session groups.
        sessionsRef.current.forEach((s) =>
          hub.invoke(HubMethods.RejoinSession, s.id).catch(() => {})
        );
      }
    });

    hub.onclose(() => setHubState("disconnected"));

    hub
      .start()
      .then(async () => {
        setHubState("connected");
        if (agentId) {
          await hub.invoke(HubMethods.AgentConnect, agentId).catch(() => {});
        }
        fetchSessions();
        fetchQueue();
      })
      .catch(() => {
        setHubState("disconnected");
        // Still load sessions via REST even if hub fails
        fetchSessions();
        fetchQueue();
      });

    return () => {
      hub.stop();
    };
  }, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Typing indicator (agent → customer) ──────────────────────────────────
  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (typingActiveRef.current && activeId) {
      typingActiveRef.current = false;
      hubRef.current?.invoke(HubMethods.AgentStoppedTyping, activeId).catch(() => {});
    }
  }, [activeId]);

  const handleDraftChange = useCallback(
    (v: string) => {
      setDraft(v);
      if (!activeId || hubRef.current?.state !== signalR.HubConnectionState.Connected) return;
      if (!typingActiveRef.current) {
        typingActiveRef.current = true;
        hubRef.current.invoke(HubMethods.AgentTyping, activeId).catch(() => {});
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(stopTyping, 2500);
    },
    [activeId, stopTyping],
  );

  // ── Send message ─────────────────────────────────────────────────────────
  const send = async () => {
    if (!draft.trim() || !activeId) return;
    const text = draft.trim();
    setDraft("");
    stopTyping();
    try {
      if (hubRef.current?.state === signalR.HubConnectionState.Connected) {
        await hubRef.current.invoke(HubMethods.AgentSendMessage, activeId, agentId, text);
      }
    } catch {
      /* hub send failed — message won't appear until next poll */
    }
  };

  // ── Accept the next queued chat (FIFO) ───────────────────────────────────
  const acceptNext = async () => {
    if (!agentId || accepting) return;
    if (hubRef.current?.state !== signalR.HubConnectionState.Connected) {
      toast.error("Not connected to the live-chat server.");
      return;
    }
    setAccepting(true);
    try {
      const res = (await hubRef.current.invoke(HubMethods.AcceptNextChat, agentId)) as {
        id?: string;
        customerName?: string;
      } | null;
      if (res?.id) {
        toast.success(`Chat accepted — ${res.customerName ?? "customer"}.`);
        await fetchSessions();
        setActiveId(res.id);
        setMobilePane("chat");
      } else {
        toast.info("No chats waiting in the queue.");
      }
    } catch {
      toast.error("Couldn't accept the next chat.");
    } finally {
      setAccepting(false);
    }
  };

  // ── Accept a SPECIFIC queued chat (cherry-pick) ──────────────────────────
  const acceptSpecific = useCallback(
    async (sessionId: string) => {
      if (!agentId || !sessionId) return;
      if (hubRef.current?.state !== signalR.HubConnectionState.Connected) {
        toast.error("Not connected to the live-chat server.");
        return;
      }
      setAccepting(true);
      try {
        const res = (await hubRef.current.invoke(
          HubMethods.AcceptChat,
          sessionId,
          agentId,
        )) as { id?: string; customerName?: string } | null;
        if (res?.id) {
          toast.success(`Chat accepted — ${res.customerName ?? "customer"}.`);
          await fetchSessions();
          setActiveId(res.id);
          setMobilePane("chat");
        } else {
          toast.info("That chat was just taken by another agent.");
        }
      } catch {
        toast.error("Couldn't accept that chat.");
      } finally {
        setAccepting(false);
      }
    },
    [agentId, fetchSessions],
  );

  // Handle a cherry-pick handed off from the Session Queue page: it stores the
  // chosen session id then routes here, where we accept it over the live hub.
  useEffect(() => {
    if (hubState !== "connected" || !agentId) return;
    const pending = sessionStorage.getItem("pendingAcceptSession");
    if (pending) {
      sessionStorage.removeItem("pendingAcceptSession");
      acceptSpecific(pending);
    }
  }, [hubState, agentId, acceptSpecific]);

  // ── Resolve the active chat (auto-creates a ticket on the backend) ────────
  const resolveActive = async () => {
    if (!activeId || !agentId) return;
    try {
      await hubRef.current?.invoke(HubMethods.ResolveChat, activeId, agentId, null);
      toast.success("Chat resolved — ticket created.");
      setActiveId(null);
      setMessages([]);
      setMobilePane("list");
      await fetchSessions();
    } catch {
      toast.error("Couldn't resolve the chat.");
    }
  };

  // ── Transfer the active chat to another agent ─────────────────────────────
  const transferActive = async (newAgentId: string) => {
    if (!activeId || !newAgentId) return;
    try {
      await hubRef.current?.invoke(HubMethods.TransferChat, activeId, newAgentId);
      toast.success("Chat transferred.");
      setActiveId(null);
      setMessages([]);
      setMobilePane("list");
      await fetchSessions();
    } catch {
      toast.error("Couldn't transfer the chat.");
    }
  };

  // ── Change own availability status ───────────────────────────────────────
  const changeStatus = async (status: AgentStatus) => {
    if (!agentId) return;
    const prev = myStatus;
    setMyStatus(status);
    try {
      if (hubRef.current?.state === signalR.HubConnectionState.Connected) {
        await hubRef.current.invoke(HubMethods.UpdateStatus, agentId, status);
      } else {
        await agentsService.updateStatus(agentId, status);
      }
      // Refresh the profile dropdown so it matches the selector immediately.
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch {
      setMyStatus(prev);
      toast.error("Couldn't update your status.");
    }
  };

  const openConv = (id: string) => {
    setActiveId(id);
    setMobilePane("chat");
  };

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-8rem)] grid-rows-1 gap-4 lg:h-[calc(100vh-7.5rem)] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <div className={mobilePane === "list" ? "block min-h-0" : "hidden lg:block lg:min-h-0"}>
          <ConvList
            sessions={sessions}
            loading={loading}
            activeId={activeId}
            setActive={openConv}
            hubState={hubState}
            queue={queue}
            accepting={accepting}
            onAcceptNext={acceptNext}
            onAcceptChat={acceptSpecific}
            myStatus={myStatus}
            onStatusChange={changeStatus}
          />
        </div>
        <div
          className={
            mobilePane === "chat"
              ? "block min-h-0 min-w-0"
              : "hidden lg:block lg:min-h-0 lg:min-w-0"
          }
        >
          {activeSession ? (
            <ChatPane
              session={activeSession}
              messages={messages}
              messagesLoading={messagesLoading}
              customerTyping={customerTyping}
              draft={draft}
              setDraft={handleDraftChange}
              showCanned={showCanned}
              setShowCanned={setShowCanned}
              onSend={send}
              onPick={(t: string) => setDraft(t)}
              onBack={() => setMobilePane("list")}
              onProfile={() => setMobilePane("profile")}
              onResolve={resolveActive}
              onTransfer={transferActive}
              agents={agents}
              selfId={agentId}
            />
          ) : (
            <GlassCard className="flex h-full items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-30" />
                {loading ? "Loading chats…" : "No active chats"}
              </div>
            </GlassCard>
          )}
        </div>
        <div className={mobilePane === "profile" ? "block min-h-0" : "hidden lg:block lg:min-h-0"}>
          <ProfilePane session={activeSession} onBack={() => setMobilePane("chat")} />
        </div>
      </div>
    </AppShell>
  );
}

// ── ConvList ───────────────────────────────────────────────────────────────

function ConvList({
  sessions,
  loading,
  activeId,
  setActive,
  hubState,
  queue,
  accepting,
  onAcceptNext,
  onAcceptChat,
  myStatus,
  onStatusChange,
}: {
  sessions: ActiveSession[];
  loading: boolean;
  activeId: string | null;
  setActive: (id: string) => void;
  hubState: "connecting" | "connected" | "disconnected";
  queue: QueueItem[];
  accepting: boolean;
  onAcceptNext: () => void;
  onAcceptChat: (id: string) => void;
  myStatus: AgentStatus;
  onStatusChange: (s: AgentStatus) => void;
}) {
  const [filter, setFilter] = useState<"All" | "Active" | "Queued">("All");
  const queueCount = queue.length;
  const list =
    filter === "Active"
      ? sessions.filter((s) => s.status === "Active")
      : filter === "Queued"
        ? sessions.filter((s) => s.status === "Queued")
        : sessions;
  // Show waiting customers (with their issue + wait time) on the All/Queued tabs.
  const showQueue = filter !== "Active" && queue.length > 0;

  const hubDot =
    hubState === "connected"
      ? "bg-brand shadow-[0_0_8px_rgba(87,184,92,0.9)]"
      : hubState === "connecting"
        ? "bg-amber-400 animate-pulse"
        : "bg-destructive";

  return (
    <GlassCard className="flex h-full flex-col overflow-hidden p-3">
      <div className="flex items-center gap-2 px-1 pb-2">
        <h3 className="text-sm font-bold">Inbox</h3>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
          {sessions.length}
        </span>
        <span className={`ml-1 h-2 w-2 rounded-full ${hubDot}`} title={`Hub: ${hubState}`} />
        <div className="ml-auto flex items-center gap-1">
          <StatusSelect value={myStatus} onChange={onStatusChange} />
          <button className="grid h-7 w-7 place-items-center rounded-lg hover:bg-muted/60">
            <Search className="h-3.5 w-3.5" />
          </button>
          <button className="grid h-7 w-7 place-items-center rounded-lg hover:bg-muted/60">
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <button
        onClick={onAcceptNext}
        disabled={accepting || queueCount === 0}
        className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-[oklch(0.78_0.16_155)] px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_22px_-10px_rgba(87,184,92,0.8)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {accepting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Inbox className="h-3.5 w-3.5" />
        )}
        {queueCount > 0 ? `Accept next chat · ${queueCount} waiting` : "No chats in queue"}
      </button>
      <div className="mb-2 flex gap-1 px-1 text-[11px]">
        {(["All", "Active", "Queued"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-2.5 py-1 font-semibold transition ${filter === f ? "bg-foreground text-background" : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
        {showQueue && (
          <div className="mb-2">
            <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Waiting in queue · {queueCount}
            </div>
            {queue.map((q) => {
              const wait = waitMinutesSince(q.queuedAt);
              const initials = q.customerName
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={q.id}
                  className="mb-1.5 flex w-full items-start gap-3 rounded-2xl border border-dashed border-amber/40 bg-amber/5 p-2.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/20 text-sm font-bold text-amber">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[13px] font-semibold">{q.customerName}</div>
                      <span className="shrink-0 rounded-full bg-amber/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber">
                        {formatWait(wait)}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      Ref: {q.reference}
                    </div>
                    {q.issueDescription && (
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-foreground/70">
                        {q.issueDescription}
                      </div>
                    )}
                    <button
                      onClick={() => onAcceptChat(q.id)}
                      disabled={accepting}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_6px_18px_-8px_rgba(87,184,92,0.9)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MessageSquare className="h-3 w-3" /> Accept
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          !showQueue && (
            <div className="py-8 text-center text-xs text-muted-foreground">No chats yet.</div>
          )
        ) : (
          list.map((s) => {
            const isActive = s.id === activeId;
            const sla = slaMinutesFor(s);
            const initials = s.customerName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`mb-1.5 flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition ${isActive ? "bg-white/85 shadow-[0_8px_22px_-12px_rgba(87,184,92,0.5)] ring-1 ring-brand/30 dark:bg-muted/70" : "hover:bg-white/55 dark:hover:bg-muted/40"}`}
              >
                <div className="relative">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
                    {initials}
                  </span>
                  {s.status === "Active" && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white shadow-[0_0_8px_rgba(87,184,92,0.9)] dark:ring-card" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-[13px] font-semibold">{s.customerName}</div>
                    <SlaPill minutes={sla} />
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    Ref: {s.reference}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${s.status === "Active" ? "bg-brand/15 text-brand" : "bg-foreground/10 text-foreground/50"}`}
                    >
                      {s.status}
                    </span>
                    {s.agentName && (
                      <span className="text-[10px] text-muted-foreground">{s.agentName}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}

function SlaPill({ minutes }: { minutes: number }) {
  const tone =
    minutes < 20
      ? "text-destructive bg-destructive/10"
      : minutes < 45
        ? "text-amber bg-amber/15"
        : "text-brand bg-brand/15";
  return (
    <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${tone}`}>
      {minutes}m
    </span>
  );
}

const STATUS_DOT: Record<AgentStatus, string> = {
  Online: "bg-brand",
  Busy: "bg-amber-400",
  Away: "bg-sky-400",
  Offline: "bg-foreground/30",
};

function StatusSelect({
  value,
  onChange,
}: {
  value: AgentStatus;
  onChange: (s: AgentStatus) => void;
}) {
  return (
    <label className="relative flex items-center" title="Your availability">
      <span className={`absolute left-2 h-2 w-2 rounded-full ${STATUS_DOT[value]}`} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AgentStatus)}
        className="cursor-pointer appearance-none rounded-lg bg-foreground/5 py-1 pl-6 pr-6 text-[11px] font-semibold outline-none hover:bg-foreground/10"
      >
        {AGENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-foreground/50" />
    </label>
  );
}

// ── ChatPane ───────────────────────────────────────────────────────────────

function ChatPane({
  session,
  messages,
  messagesLoading,
  customerTyping,
  draft,
  setDraft,
  showCanned,
  setShowCanned,
  onSend,
  onPick,
  onBack,
  onProfile,
  onResolve,
  onTransfer,
  agents,
  selfId,
}: {
  session: ActiveSession;
  messages: ChatMessage[];
  messagesLoading: boolean;
  customerTyping: boolean;
  draft: string;
  setDraft: (v: string) => void;
  showCanned: boolean;
  setShowCanned: (v: boolean) => void;
  onSend: () => void;
  onPick: (t: string) => void;
  onBack: () => void;
  onProfile: () => void;
  onResolve: () => void;
  onTransfer: (agentId: string) => void;
  agents: Agent[];
  selfId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const { replies: cannedReplies } = useCannedReplies();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, customerTyping]);

  const transferTargets = agents.filter(
    (a) => a.id !== selfId && a.role !== "Admin" && a.status !== "Offline",
  );

  return (
    <GlassCard className="flex h-full min-w-0 flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
        <button
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-muted/60 lg:hidden"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
          {session.customerName
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[14px] font-semibold">{session.customerName}</div>
            <span className="hidden rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand sm:inline">
              {session.status}
            </span>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            Ref: {session.reference}
            {session.agentName ? ` · ${session.agentName}` : ""}
          </div>
        </div>
        <button
          onClick={onProfile}
          className="grid h-9 w-9 place-items-center rounded-xl hover:bg-muted/60 lg:hidden"
          aria-label="Customer profile"
        >
          <User className="h-4 w-4" />
        </button>

        {/* Transfer */}
        <div className="relative">
          <button
            onClick={() => setShowTransfer((v) => !v)}
            className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-foreground/70 hover:bg-muted/60"
            title="Transfer chat"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Transfer</span>
          </button>
          {showTransfer && (
            <div className="absolute right-0 top-11 z-20 w-56 rounded-2xl border border-border bg-popover p-2 shadow-xl backdrop-blur">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Transfer to agent
              </div>
              {transferTargets.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  No other agents available.
                </div>
              ) : (
                transferTargets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setShowTransfer(false);
                      onTransfer(a.id);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-brand/10"
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${STATUS_DOT[a.status as AgentStatus] ?? "bg-foreground/30"}`}
                    />
                    <span className="flex-1 truncate font-medium">{a.name}</span>
                    <span className="text-[10px] text-muted-foreground">{a.status}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Resolve */}
        <button
          onClick={onResolve}
          className="flex h-9 items-center gap-1.5 rounded-xl bg-brand/10 px-2.5 text-xs font-semibold text-brand hover:bg-brand/20"
          title="Resolve chat & create ticket"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline">Resolve</span>
        </button>
      </div>

      {/* messages */}
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-5">
        <div className="mx-auto w-fit rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Conversation
        </div>
        {messagesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No messages yet.</div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              if (m.isWhisper) {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <div className="max-w-[80%] rounded-2xl border border-amber-400/40 bg-amber-50/80 px-3 py-2 text-center text-[11px] text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30">
                      <span className="font-semibold">Whisper · {m.senderName}:</span> {m.content}
                    </div>
                  </motion.div>
                );
              }
              const fromCustomer = m.senderType.toLowerCase() === "customer";
              // Supervisor messages are posted as senderType "Agent" but tagged
              // senderName "Supervisor" — give them a distinct violet bubble so the
              // agent can tell them apart from their own replies.
              const isSupervisor = !fromCustomer && m.senderName === "Supervisor";
              const bubble = fromCustomer
                ? "rounded-bl-md bg-muted/80 text-foreground dark:bg-muted/60"
                : isSupervisor
                  ? "rounded-br-md bg-gradient-to-br from-violet-500 to-violet-600 text-white"
                  : "rounded-br-md bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] text-white";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${fromCustomer ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${bubble}`}
                  >
                    {m.content}
                    <div
                      className={`mt-1 text-[10px] ${!fromCustomer ? "text-white/70" : "text-muted-foreground"}`}
                    >
                      {isSupervisor ? "Supervisor" : m.senderName} · {formatMsgTime(m.timestamp)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        {customerTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted/80 px-4 py-3 shadow-sm dark:bg-muted/60">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
              <span className="ml-1 text-[11px] text-muted-foreground">
                {session.customerName.split(" ")[0]} is typing…
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="border-t border-border p-3">
        {showCanned && (
          <div className="mb-2 rounded-2xl bg-muted/60 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Canned replies
            </div>
            <div className="space-y-1">
              {cannedReplies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onPick(c.text);
                    setShowCanned(false);
                  }}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  {c.text}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="glass-soft flex items-end gap-2 rounded-2xl p-2">
          <button
            onClick={() => setShowCanned(!showCanned)}
            className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-medium text-foreground/70 hover:bg-muted/60"
          >
            <FileText className="h-4 w-4" /> Canned <ChevronDown className="h-3 w-3" />
          </button>
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={`Reply to ${session.customerName.split(" ")[0]}…`}
            className="min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          />
          <div className="relative">
            {showEmoji && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
                <div className="absolute bottom-11 right-0 z-20 grid w-56 grid-cols-8 gap-0.5 rounded-2xl border border-border bg-popover p-2 shadow-lg">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        setDraft(draft + e);
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
          <button
            onClick={onSend}
            className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] text-white shadow-[0_8px_22px_-8px_rgba(87,184,92,0.9)] transition hover:brightness-105"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// ── ProfilePane ────────────────────────────────────────────────────────────

function ProfilePane({ session, onBack }: { session: ActiveSession | null; onBack?: () => void }) {
  if (!session) {
    return (
      <GlassCard className="flex h-full items-center justify-center">
        <div className="text-center text-xs text-muted-foreground">
          Select a chat to view details.
        </div>
      </GlassCard>
    );
  }

  const initials = session.customerName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  let orderInfo: OrderSnapshot | null = null;
  try {
    orderInfo = session.orderSnapshot ? (JSON.parse(session.orderSnapshot) as OrderSnapshot) : null;
  } catch {
    orderInfo = null;
  }

  return (
    <GlassCard className="scrollbar-thin h-full overflow-y-auto p-5">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60 lg:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to chat
        </button>
      )}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand/20 text-2xl font-bold text-brand ring-2 ring-white shadow-[0_10px_30px_-12px_rgba(87,184,92,0.6)] dark:ring-card">
            {initials}
          </span>
          {session.status === "Active" && (
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-brand text-[10px] font-bold text-white ring-2 ring-white dark:ring-card">
              ●
            </span>
          )}
        </div>
        <div className="mt-3 text-[15px] font-bold">{session.customerName}</div>
        <div className="text-[11px] text-muted-foreground">Ref: {session.reference}</div>
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">
            {session.status}
          </span>
        </div>
      </div>

      <Section title="Order details">
        <OrderDetails order={orderInfo} fallbackReference={session.reference} />
      </Section>

      <Section title="Session info">
        <ul className="space-y-2 text-xs">
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <div>
              <div className="font-medium">Queued</div>
              <div className="text-[10px] text-muted-foreground">
                {new Date(session.queuedAt).toLocaleString()}
              </div>
            </div>
          </li>
          {session.acceptedAt && (
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <div>
                <div className="font-medium">Accepted</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(session.acceptedAt).toLocaleString()}
                </div>
              </div>
            </li>
          )}
          {session.agentName && (
            <li className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <div>
                <div className="font-medium">Assigned agent</div>
                <div className="text-[10px] text-muted-foreground">{session.agentName}</div>
              </div>
            </li>
          )}
        </ul>
      </Section>

      <Section title="SLA remaining">
        <div className="glass-soft flex items-center gap-3 rounded-2xl p-3">
          <div className="flex-1">
            <div className="text-xs font-semibold">{slaMinutesFor(session)} minutes left</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-sky"
                style={{
                  width: `${Math.min((slaMinutesFor(session) / 60) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
          <span className="text-xs font-bold text-brand">{slaMinutesFor(session)}m</span>
        </div>
      </Section>
    </GlassCard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}
