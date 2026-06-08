import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/frankie/AppShell";
import { GlassCard } from "@/components/frankie/GlassCard";
import { useEffect, useState } from "react";
import { User, Lock, MessageSquareText, Loader2, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { accountService } from "@/services/accountService";
import { agentsService, type Agent } from "@/services/agentsService";
import { useAuth } from "@/hooks/use-auth";
import { useCannedReplies } from "@/lib/canned-replies";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Frankie" },
      { name: "description", content: "Configure profile, password and canned replies." },
    ],
  }),
  component: Settings,
});

const tabs = [
  { id: "profile", label: "Personal Information", icon: User },
  { id: "security", label: "Security & Password", icon: Lock },
  { id: "canned", label: "Canned replies", icon: MessageSquareText },
] as const;

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Settings() {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("profile");
  return (
    <AppShell>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <GlassCard className="h-fit p-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition ${tab === t.id ? "bg-gradient-to-r from-brand to-[oklch(0.78_0.16_155)] text-white shadow-[0_8px_22px_-10px_rgba(87,184,92,0.8)]" : "hover:bg-muted/60"}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </GlassCard>

        <GlassCard className="p-6">
          {tab === "profile" && <Profile />}
          {tab === "security" && <Security />}
          {tab === "canned" && <Canned />}
        </GlassCard>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-border bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-brand/40"
      />
    </label>
  );
}

function Profile() {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [account, setAccount] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    accountService
      .getMe()
      .then((me) => {
        if (cancelled) return;
        const parts = (me.name ?? "").trim().split(" ");
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
        setEmail(me.email ?? "");
        setPhone(me.phone ?? "");
        // Pull the full agent record for the read-only account overview
        // (active chats + last seen aren't on the /me payload).
        agentsService
          .getById(me.id)
          .then((a) => !cancelled && setAccount(a))
          .catch(() => {
            if (!cancelled)
              setAccount({
                id: me.id,
                name: me.name,
                email: me.email,
                role: me.role,
                status: me.status,
                avatarUrl: me.avatarUrl,
                lastSeenAt: null,
              });
          });
      })
      .catch(() => {
        const parts = (user?.displayName ?? "").trim().split(" ");
        setFirstName(parts[0] ?? "");
        setLastName(parts.slice(1).join(" "));
        setEmail(user?.email ?? "");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.displayName, user?.email]);

  const save = async () => {
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!name || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await accountService.updateProfile({ name, email: email.trim(), phone });
      updateUser({ displayName: updated.name, email: updated.email });
      toast.success("Profile updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Personal Information</h2>
      <p className="text-sm text-muted-foreground">How you appear to teammates and customers.</p>
      <div className="mt-5 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/20 text-lg font-bold text-brand">
          {initials(`${firstName} ${lastName}`)}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="First name" value={firstName} onChange={setFirstName} />
        <Field label="Last name" value={lastName} onChange={setLastName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Phone" value={phone} onChange={setPhone} />
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-[oklch(0.78_0.16_155)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_-10px_rgba(87,184,92,0.8)] transition hover:brightness-105 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
      </div>

      {/* Read-only account overview */}
      <div className="mt-8 border-t border-foreground/10 pt-5">
        <h3 className="text-sm font-semibold">Account details</h3>
        <p className="text-xs text-muted-foreground">Read-only — managed by your workspace.</p>
        <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <DetailRow
            label="Agent ID"
            value={account ? account.id.slice(0, 8).toUpperCase() : "—"}
            mono
          />
          <DetailRow label="Role" value={account?.role ?? "—"} />
          <DetailRow label="Status" value={account?.status ?? "—"} capitalize />
          <DetailRow
            label="Active chats"
            value={account?.activeChats != null ? String(account.activeChats) : "—"}
          />
          <DetailRow
            label="Last seen"
            value={
              account?.lastSeenAt
                ? new Date(account.lastSeenAt).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"
            }
          />
        </dl>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-foreground/10 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`font-medium ${mono ? "font-mono text-xs" : ""} ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Security() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!current || !next) {
      toast.error("Enter your current and new password.");
      return;
    }
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await accountService.changePassword({ currentPassword: current, newPassword: next });
      toast.success("Password changed.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Security & Password</h2>
      <p className="text-sm text-muted-foreground">Update your password.</p>
      <div className="mt-5 grid max-w-md grid-cols-1 gap-4">
        <Field label="Current password" type="password" value={current} onChange={setCurrent} />
        <Field label="New password" type="password" value={next} onChange={setNext} />
        <Field label="Confirm new password" type="password" value={confirm} onChange={setConfirm} />
      </div>
      <div className="mt-6 flex max-w-md justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-[oklch(0.78_0.16_155)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_22px_-10px_rgba(87,184,92,0.8)] transition hover:brightness-105 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </div>
    </div>
  );
}

function Canned() {
  const { replies, isLoading, add, update, remove } = useCannedReplies();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [busy, setBusy] = useState(false);

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    if (!editingText.trim()) {
      toast.error("Reply cannot be empty.");
      return;
    }
    setBusy(true);
    try {
      await update(editingId, editingText);
      setEditingId(null);
      setEditingText("");
      toast.success("Canned reply updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update reply.");
    } finally {
      setBusy(false);
    }
  };

  const saveNew = async () => {
    if (!newText.trim()) {
      toast.error("Reply cannot be empty.");
      return;
    }
    setBusy(true);
    try {
      await add(newText);
      setNewText("");
      setAdding(false);
      toast.success("Canned reply added.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add reply.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusy(true);
    try {
      await remove(id);
      toast.success("Canned reply removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove reply.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Canned replies</h2>
      <p className="text-sm text-muted-foreground">
        Reusable snippets shared by the whole team in the chat composer.
      </p>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {replies.map((c, i) => (
            <div key={c.id} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3">
              <span className="mt-0.5 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                /{(i + 1).toString()}
              </span>
              {editingId === c.id ? (
                <>
                  <textarea
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                    className="flex-1 resize-none rounded-xl border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
                  />
                  <button
                    onClick={saveEdit}
                    disabled={busy}
                    className="text-brand hover:text-brand/80 disabled:opacity-50"
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditingText("");
                    }}
                    className="text-muted-foreground hover:text-foreground"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 text-sm">{c.text}</div>
                  <button
                    onClick={() => startEdit(c.id, c.text)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(c.id)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-red-500 disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}

          {adding ? (
            <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3">
              <span className="mt-0.5 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                /{(replies.length + 1).toString()}
              </span>
              <textarea
                autoFocus
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                rows={2}
                placeholder="Type a reusable reply…"
                className="flex-1 resize-none rounded-xl border border-border bg-background/40 px-3 py-2 text-sm outline-none focus:border-brand/40"
              />
              <button
                onClick={saveNew}
                disabled={busy}
                className="text-brand hover:text-brand/80 disabled:opacity-50"
                title="Save"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setNewText("");
                }}
                className="text-muted-foreground hover:text-foreground"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="rounded-2xl border border-dashed border-foreground/20 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40"
            >
              + New canned reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}
