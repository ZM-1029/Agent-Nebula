import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { cannedReplies } from "@/data/dummy";
import { useState } from "react";
import { User, MessageSquareText } from "lucide-react";
import mayaAvatar from "@/assets/maya-avatar.jpg";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Frankie" },
      { name: "description", content: "Configure profile and canned replies." },
    ],
  }),
  component: Settings,
});

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "canned", label: "Canned replies", icon: MessageSquareText },
] as const;

function Settings() {
  const [tab, setTab] = useState<typeof tabs[number]["id"]>("profile");
  return (
    <AppShell>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <GlassCard className="h-fit p-2">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition ${tab===t.id ? "bg-gradient-to-r from-brand to-[oklch(0.78_0.16_155)] text-white shadow-[0_8px_22px_-10px_rgba(87,184,92,0.8)]" : "hover:bg-white/60"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </GlassCard>

        <GlassCard className="p-6">
          {tab === "profile" && <Profile />}
          {tab === "canned" && <Canned />}
        </GlassCard>
      </div>
    </AppShell>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <input defaultValue={defaultValue} className="w-full rounded-2xl border border-white/70 bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-brand/40" />
    </label>
  );
}

function Toggle({ label, desc, defaultChecked }: { label: string; desc?: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/55 p-4">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <button onClick={() => setOn(!on)} className={`relative h-6 w-11 rounded-full transition ${on ? "bg-brand shadow-[0_0_12px_rgba(87,184,92,0.6)]" : "bg-foreground/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Profile() {
  return (
    <div>
      <h2 className="text-xl font-bold">Profile</h2>
      <p className="text-sm text-muted-foreground">How you appear to teammates and customers.</p>
      <div className="mt-5 flex items-center gap-4">
        <img src={mayaAvatar} alt="Maya Reyes profile" width={1024} height={1024} loading="lazy" className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow" />
        <button className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">Upload new</button>
        <button className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-semibold">Remove</button>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Full name" defaultValue="Maya Reyes" />
        <Field label="Display name" defaultValue="Maya" />
        <Field label="Chat" defaultValue="maya@frankie.support" />
        <Field label="Timezone" defaultValue="America/Toronto" />
      </div>
    </div>
  );
}
function Canned() {
  return (
    <div>
      <h2 className="text-xl font-bold">Canned replies</h2>
      <p className="text-sm text-muted-foreground">Reusable snippets available in the chat composer.</p>
      <div className="mt-4 space-y-2">
        {cannedReplies.map((c, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl bg-white/55 p-3">
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">/{(i+1).toString()}</span>
            <div className="flex-1 text-sm">{c}</div>
            <button className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
          </div>
        ))}
        <button className="rounded-2xl border border-dashed border-foreground/20 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-white/40">+ New canned reply</button>
      </div>
    </div>
  );
}
