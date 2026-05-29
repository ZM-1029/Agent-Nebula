import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { conversations, customers, cannedReplies, type Conversation, type Message } from "@/data/dummy";
import { useEffect, useMemo, useState } from "react";
import { Paperclip, Smile, Send, Zap, FileText, ChevronDown, Phone, Video, MoreHorizontal, Search, Filter, ArrowLeft, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/live-chats")({
  head: () => ({
    meta: [
      { title: "Live Chats — Frankie" },
      { name: "description", content: "Active conversations with SLA timers, AI assist, and a futuristic customer profile drawer." },
    ],
  }),
  component: LiveChats,
});

function LiveChats() {
  const [activeId, setActiveId] = useState(conversations[0].id);
  const active = conversations.find(c => c.id === activeId)!;
  const customer = customers.find(c => c.id === active.customerId)!;
  const [messages, setMessages] = useState<Message[]>(active.messages);
  const [draft, setDraft] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  // mobile pane navigation: list -> chat -> profile
  const [mobilePane, setMobilePane] = useState<"list" | "chat" | "profile">("list");

  useEffect(() => { setMessages(active.messages); }, [activeId]);

  // simulate a new incoming message every 25s
  useEffect(() => {
    const t = setInterval(() => {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), from: "customer", text: "Any update? 🙏", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    }, 25000);
    return () => clearInterval(t);
  }, [activeId]);

  const send = () => {
    if (!draft.trim()) return;
    setMessages(p => [...p, { id: crypto.randomUUID(), from: "agent", text: draft, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setDraft("");
  };

  const openConv = (id: string) => { setActiveId(id); setMobilePane("chat"); };

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-8rem)] gap-4 lg:h-[calc(100vh-7.5rem)] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <div className={mobilePane === "list" ? "block" : "hidden lg:block"}>
          <ConvList active={activeId} setActive={openConv} />
        </div>
        <div className={mobilePane === "chat" ? "block min-w-0" : "hidden lg:block lg:min-w-0"}>
          <ChatPane customer={customer} conv={active} messages={messages}
            draft={draft} setDraft={setDraft}
            showCanned={showCanned} setShowCanned={setShowCanned}
            onSend={send}
            onPick={(t: string) => setDraft(t)}
            onBack={() => setMobilePane("list")}
            onProfile={() => setMobilePane("profile")}
          />
        </div>
        <div className={mobilePane === "profile" ? "block" : "hidden lg:block"}>
          <ProfilePane customer={customer} onBack={() => setMobilePane("chat")} />
        </div>
      </div>
    </AppShell>
  );
}


function ConvList({ active, setActive }: { active: string; setActive: (id: string) => void }) {
  const [filter, setFilter] = useState<"All" | "Urgent" | "Mine">("All");
  const list = useMemo(() => filter === "Urgent" ? conversations.filter(c => c.priority === "Urgent" || c.priority === "High") : conversations, [filter]);
  return (
    <GlassCard className="flex h-full flex-col overflow-hidden p-3">
      <div className="flex items-center gap-2 px-1 pb-2">
        <h3 className="text-sm font-bold">Inbox</h3>
        <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">{conversations.length}</span>
        <div className="ml-auto flex gap-1">
          <button className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/60"><Search className="h-3.5 w-3.5" /></button>
          <button className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/60"><Filter className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="mb-2 flex gap-1 px-1 text-[11px]">
        {(["All","Urgent","Mine"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-2.5 py-1 font-semibold transition ${filter===f ? "bg-foreground text-background" : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"}`}>{f}</button>
        ))}
      </div>
      <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
        {list.map(c => {
          const cu = customers.find(x => x.id === c.customerId)!;
          const isActive = c.id === active;
          return (
            <button key={c.id} onClick={() => setActive(c.id)} className={`mb-1.5 flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition ${isActive ? "bg-white/85 shadow-[0_8px_22px_-12px_rgba(87,184,92,0.5)] ring-1 ring-brand/30" : "hover:bg-white/55"}`}>
              <div className="relative">
                <img src={cu.avatar} alt={cu.name} className="h-10 w-10 rounded-full bg-white/70 ring-1 ring-white/80" />
                {cu.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-white shadow-[0_0_8px_rgba(87,184,92,0.9)]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="truncate text-[13px] font-semibold">{cu.name}</div>
                  <SlaPill minutes={c.slaMinutes} />
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{c.subject}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] font-medium text-foreground/50">{c.channel}</span>
                  {c.unread > 0 && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">{c.unread}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

function SlaPill({ minutes }: { minutes: number }) {
  const tone = minutes < 20 ? "text-destructive bg-destructive/10" : minutes < 45 ? "text-amber bg-amber/15" : "text-brand bg-brand/15";
  return <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${tone}`}>{minutes}m</span>;
}

function ChatPane({ customer, conv, messages, draft, setDraft, showCanned, setShowCanned, onSend, onPick, onBack, onProfile }: any) {
  return (
    <GlassCard className="flex h-full min-w-0 flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-white/60 px-3 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
        <button onClick={onBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-white/60 lg:hidden" aria-label="Back to inbox">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <img src={customer.avatar} className="h-10 w-10 shrink-0 rounded-full bg-white/70 ring-1 ring-white/80" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[14px] font-semibold">{customer.name}</div>
            <span className="hidden rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand sm:inline">{customer.plan}</span>
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{conv.subject} · {conv.channel}</div>
        </div>
        <button onClick={onProfile} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/60 lg:hidden" aria-label="Customer profile"><User className="h-4 w-4" /></button>
        <button className="hidden h-9 w-9 place-items-center rounded-xl hover:bg-white/60 sm:grid"><Phone className="h-4 w-4" /></button>
        <button className="hidden h-9 w-9 place-items-center rounded-xl hover:bg-white/60 sm:grid"><Video className="h-4 w-4" /></button>
        <button className="hidden h-9 w-9 place-items-center rounded-xl hover:bg-white/60 sm:grid"><MoreHorizontal className="h-4 w-4" /></button>
      </div>

      {/* messages */}
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-5">
        <div className="mx-auto w-fit rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Today</div>
        <AnimatePresence initial={false}>
          {messages.map((m: Message) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.from === "customer" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.from === "customer" ? "rounded-bl-md bg-white/85 text-foreground" : m.from === "ai" ? "rounded-br-md bg-gradient-to-br from-violet/20 to-sky/15 text-foreground" : "rounded-br-md bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] text-white"}`}>
                {m.text}
                <div className={`mt-1 text-[10px] ${m.from === "agent" ? "text-white/70" : "text-muted-foreground"}`}>{m.time}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:0.3s]" />
          </span>
          {customer.name.split(" ")[0]} is typing…
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-white/60 p-3">
        {showCanned && (
          <div className="mb-2 rounded-2xl bg-white/70 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Canned replies</div>
            <div className="space-y-1">
              {cannedReplies.map((c, i) => (
                <button key={i} onClick={() => { onPick(c); setShowCanned(false); }} className="block w-full rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white">{c}</button>
              ))}
            </div>
          </div>
        )}
        <div className="glass-soft flex items-end gap-2 rounded-2xl p-2">
          <button className="grid h-9 w-9 place-items-center rounded-xl text-foreground/60 hover:bg-white/70"><Paperclip className="h-4 w-4" /></button>
          <button onClick={() => setShowCanned(!showCanned)} className="flex h-9 items-center gap-1 rounded-xl px-2 text-xs font-medium text-foreground/70 hover:bg-white/70"><FileText className="h-4 w-4" /> Canned <ChevronDown className="h-3 w-3" /></button>
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
            placeholder="Reply to Maya…"
            className="min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          />
          <button className="grid h-9 w-9 place-items-center rounded-xl text-foreground/60 hover:bg-white/70"><Smile className="h-4 w-4" /></button>
          <button onClick={onSend} className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-[oklch(0.78_0.16_155)] text-white shadow-[0_8px_22px_-8px_rgba(87,184,92,0.9)] transition hover:brightness-105">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

function ProfilePane({ customer, onBack }: { customer: ReturnType<typeof customers["find"]> & any; onBack?: () => void }) {
  return (
    <GlassCard className="scrollbar-thin h-full overflow-y-auto p-5">
      {onBack && (
        <button onClick={onBack} className="mb-3 flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-white/60 lg:hidden">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to chat
        </button>
      )}
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <img src={customer.avatar} className="h-20 w-20 rounded-3xl bg-white/70 ring-2 ring-white shadow-[0_10px_30px_-12px_rgba(87,184,92,0.6)]" />
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-brand text-[10px] font-bold text-white ring-2 ring-white">●</span>
        </div>
        <div className="mt-3 text-[15px] font-bold">{customer.name}</div>
        <div className="text-[11px] text-muted-foreground">{customer.email}</div>
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {customer.tags.map((t: string) => <span key={t} className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand">{t}</span>)}
        </div>
      </div>


      <Section title="Sentiment">
        <div className="glass-soft flex items-center gap-3 rounded-2xl p-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber/20 text-amber">😊</div>
          <div className="flex-1">
            <div className="text-xs font-semibold">Mostly positive · slightly anxious</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/5">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-brand to-sky" />
            </div>
          </div>
          <span className="text-xs font-bold text-brand">72</span>
        </div>
      </Section>

      <Section title="Interaction history">
        <ul className="space-y-2 text-xs">
          {[
            { t: "Today · 14:22", e: "Opened chat: export 504" },
            { t: "Apr 09", e: "Resolved · billing question" },
            { t: "Mar 18", e: "Upgraded to Pro Annual" },
            { t: "Feb 02", e: "Onboarded via Slack invite" },
          ].map((h, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
              <div>
                <div className="font-medium">{h.e}</div>
                <div className="text-[10px] text-muted-foreground">{h.t}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recent orders">
        {customer.orders.length === 0 ? (
          <div className="rounded-2xl bg-foreground/5 p-3 text-center text-[11px] text-muted-foreground">No orders yet.</div>
        ) : (
          <ul className="space-y-2">
            {customer.orders.map((o: any) => (
              <li key={o.id} className="glass-soft flex items-center justify-between rounded-2xl p-3 text-xs">
                <div>
                  <div className="font-semibold">{o.item}</div>
                  <div className="text-[10px] text-muted-foreground">{o.id} · {o.date}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{o.total}</div>
                  <div className="text-[10px] text-brand">{o.status}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </GlassCard>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="glass-soft rounded-2xl py-2"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="text-[12px] font-bold">{value}</div></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-5"><div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</div>{children}</div>;
}
