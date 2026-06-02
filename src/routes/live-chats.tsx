import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { cannedReplies } from "@/data/dummy";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Paperclip,
  Smile,
  Send,
  FileText,
  ChevronDown,
  Phone,
  Video,
  MoreHorizontal,
  Search,
  Filter,
  ArrowLeft,
  User,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  liveChatService,
  createLiveChatHub,
  HubEvents,
  HubMethods,
  type ActiveSession,
  type ChatMessage,
} from "@/services/liveChatService";
import { useAuth } from "@/hooks/use-auth";
import * as signalR from "@microsoft/signalr";

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

// ── Main component ─────────────────────────────────────────────────────────

function LiveChats() {
  const { user } = useAuth();
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

  const hubRef = useRef<signalR.HubConnection | null>(null);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  // ── Load sessions ────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const data = agentId
        ? await liveChatService.getAgentSessions(agentId)
        : await liveChatService.getActiveSessions();
      setSessions(data);
      if (!activeId && data.length > 0) setActiveId(data[0].id);
    } catch {
      /* ignore — hub events will keep data fresh */
    } finally {
      setLoading(false);
    }
  }, [agentId, activeId]);

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
    if (activeId) fetchMessages(activeId);
  }, [activeId, fetchMessages]);

  // ── SignalR hub ──────────────────────────────────────────────────────────
  useEffect(() => {
    const hub = createLiveChatHub();
    hubRef.current = hub;

    hub.on(HubEvents.MessageReceived, (msg: ChatMessage) => {
      // Only append if it belongs to the currently open session
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

    hub.on(HubEvents.QueueUpdated, () => {
      fetchSessions();
    });

    hub.on(HubEvents.SessionAssigned, () => {
      fetchSessions();
    });

    hub.on(HubEvents.SessionResolved, () => {
      fetchSessions();
    });

    hub.onreconnected(() => {
      setHubState("connected");
      fetchSessions();
      if (agentId) hub.invoke(HubMethods.AgentConnect).catch(() => {});
    });

    hub.onclose(() => setHubState("disconnected"));

    hub
      .start()
      .then(async () => {
        setHubState("connected");
        if (agentId) {
          await hub.invoke(HubMethods.AgentConnect).catch(() => {});
        }
        fetchSessions();
      })
      .catch(() => {
        setHubState("disconnected");
        // Still load sessions via REST even if hub fails
        fetchSessions();
      });

    return () => {
      hub.stop();
    };
  }, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send message ─────────────────────────────────────────────────────────
  const send = async () => {
    if (!draft.trim() || !activeId) return;
    const text = draft.trim();
    setDraft("");
    try {
      if (hubRef.current?.state === signalR.HubConnectionState.Connected) {
        await hubRef.current.invoke(HubMethods.AgentSendMessage, activeId, text);
      }
    } catch {
      /* hub send failed — message won't appear until next poll */
    }
  };

  const openConv = (id: string) => {
    setActiveId(id);
    setMobilePane("chat");
  };

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-8rem)] gap-4 lg:h-[calc(100vh-7.5rem)] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <div className={mobilePane === "list" ? "block" : "hidden lg:block"}>
          <ConvList
            sessions={sessions}
            loading={loading}
            activeId={activeId}
            setActive={openConv}
            hubState={hubState}
          />
        </div>
        <div className={mobilePane === "chat" ? "block min-w-0" : "hidden lg:block lg:min-w-0"}>
          {activeSession ? (
            <ChatPane
              session={activeSession}
              messages={messages}
              messagesLoading={messagesLoading}
              draft={draft}
              setDraft={setDraft}
              showCanned={showCanned}
              setShowCanned={setShowCanned}
              onSend={send}
              onPick={(t: string) => setDraft(t)}
              onBack={() => setMobilePane("list")}
              onProfile={() => setMobilePane("profile")}
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
        <div className={mobilePane === "profile" ? "block" : "hidden lg:block"}>
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
}: {
  sessions: ActiveSession[];
  loading: boolean;
  activeId: string | null;
  setActive: (id: string) => void;
  hubState: "connecting" | "connected" | "disconnected";
}) {
  const [filter, setFilter] = useState<"All" | "Active" | "Queued">("All");
  const list =
    filter === "Active"
      ? sessions.filter((s) => s.status === "Active")
      : filter === "Queued"
        ? sessions.filter((s) => s.status === "Queued")
        : sessions;

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
        <div className="ml-auto flex gap-1">
          <button className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/60">
            <Search className="h-3.5 w-3.5" />
          </button>
          <button className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/60">
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
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
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No chats yet.</div>
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
                className={`mb-1.5 flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition ${isActive ? "bg-white/85 shadow-[0_8px_22px_-12px_rgba(87,184,92,0.5)] ring-1 ring-brand/30" : "hover:bg-white/55"}`}
              >
                <div className="relative">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/20 text-sm font-bold text-brand">
                    {initials}
                  </span>
                  {s.status === "Active" && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white shadow-[0_0_8px_rgba(87,184,92,0.9)]" />
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

// ── ChatPane ───────────────────────────────────────────────────────────────

function ChatPane({
  session,
  messages,
  messagesLoading,
  draft,
  setDraft,
  showCanned,
  setShowCanned,
  onSend,
  onPick,
  onBack,
  onProfile,
}: {
  session: ActiveSession;
  messages: ChatMessage[];
  messagesLoading: boolean;
  draft: string;
  setDraft: (v: string) => void;
  showCanned: boolean;
  setShowCanned: (v: boolean) => void;
  onSend: () => void;
  onPick: (t: string) => void;
  onBack: () => void;
  onProfile: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <GlassCard className="flex h-full min-w-0 flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-white/60 px-3 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
        <button
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-white/60 lg:hidden"
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
          className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/60 lg:hidden"
          aria-label="Customer profile"
        >
          <User className="h-4 w-4" />
        </button>
        <button className="hidden h-9 w-9 place-items-center rounded-xl hover:bg-white/60 sm:grid">
          <Phone className="h-4 w-4" />
        </button>
        <button className="hidden h-9 w-9 place-items-center rounded-xl hover:bg-white/60 sm:grid">
          <Video className="h-4 w-4" />
        </button>
        <button className="hidden h-9 w-9 place-items-center rounded-xl hover:bg-white/60 sm:grid">
          <MoreHorizontal className="h-4 w-4" />
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
            {messages
              .filter((m) => !m.isWhisper)
              .map((m, i) => {
                const fromCustomer = m.senderType.toLowerCase() === "customer";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${fromCustomer ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${fromCustomer ? "rounded-bl-md bg-white/85 text-foreground" : "rounded-br-md bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] text-white"}`}
                    >
                      {m.content}
                      <div
                        className={`mt-1 text-[10px] ${!fromCustomer ? "text-white/70" : "text-muted-foreground"}`}
                      >
                        {m.senderName} · {formatMsgTime(m.timestamp)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* composer */}
      <div className="border-t border-white/60 p-3">
        {showCanned && (
          <div className="mb-2 rounded-2xl bg-white/70 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Canned replies
            </div>
            <div className="space-y-1">
              {cannedReplies.map((c, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onPick(c);
                    setShowCanned(false);
                  }}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="glass-soft flex items-end gap-2 rounded-2xl p-2">
          <button className="grid h-9 w-9 place-items-center rounded-xl text-foreground/60 hover:bg-white/70">
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCanned(!showCanned)}
            className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-medium text-foreground/70 hover:bg-white/70"
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
          <button className="grid h-9 w-9 place-items-center rounded-xl text-foreground/60 hover:bg-white/70">
            <Smile className="h-4 w-4" />
          </button>
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

  return (
    <GlassCard className="scrollbar-thin h-full overflow-y-auto p-5">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-white/60 lg:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to chat
        </button>
      )}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand/20 text-2xl font-bold text-brand ring-2 ring-white shadow-[0_10px_30px_-12px_rgba(87,184,92,0.6)]">
            {initials}
          </span>
          {session.status === "Active" && (
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-brand text-[10px] font-bold text-white ring-2 ring-white">
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
