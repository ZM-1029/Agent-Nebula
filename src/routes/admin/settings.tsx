import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Lock, Loader2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { accountService } from "@/services/accountService";
import { settingsService, type WorkspaceSettings } from "@/services/settingsService";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Helix" },
      { name: "description", content: "Manage personal information and security." },
    ],
  }),
  component: SettingsPage,
});

const tabs = [
  { id: "personal", label: "Personal Information", icon: User },
  { id: "security", label: "Security & Password", icon: Lock },
  { id: "routing", label: "Auto-assign", icon: Shuffle },
] as const;

type TabId = (typeof tabs)[number]["id"];

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SettingsPage() {
  const [tab, setTab] = useState<TabId>("personal");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          <span>Dashboard</span> <span className="mx-1">/</span>{" "}
          <span className="font-medium text-foreground">Settings</span>
        </p>
      </div>

      <div className="rounded-2xl glass">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
          <nav className="border-b p-3 md:border-b-0 md:border-r">
            <ul className="space-y-1">
              {tabs.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                      tab === t.id
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    <t.icon className="h-4 w-4" />
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-6">
            {tab === "personal" ? (
              <PersonalInfo />
            ) : tab === "security" ? (
              <Security />
            ) : (
              <Routing />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalInfo() {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the real profile from the backend
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
      })
      .catch(() => {
        // Fall back to whatever the auth context already knows
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
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Personal Information</h2>
      <p className="text-sm text-muted-foreground">Update your personal information here.</p>

      <div className="mt-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground">
          {initials(`${firstName} ${lastName}`)}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FloatingField label="First Name" value={firstName} onChange={setFirstName} />
        <FloatingField label="Last Name" value={lastName} onChange={setLastName} />
        <div className="sm:col-span-2">
          <FloatingField label="Email" type="email" value={email} onChange={setEmail} />
        </div>
        <div className="sm:col-span-2">
          <FloatingField label="Phone" value={phone} onChange={setPhone} />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          className="gradient-primary text-primary-foreground"
          onClick={save}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
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
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Security & Password</h2>
      <p className="text-sm text-muted-foreground">Update your password and security settings.</p>
      <div className="mt-6 grid grid-cols-1 gap-4">
        <FloatingField
          label="Current Password"
          type="password"
          value={current}
          onChange={setCurrent}
        />
        <FloatingField label="New Password" type="password" value={next} onChange={setNext} />
        <FloatingField
          label="Confirm New Password"
          type="password"
          value={confirm}
          onChange={setConfirm}
        />
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          className="gradient-primary text-primary-foreground"
          onClick={save}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </div>
    </div>
  );
}

function Routing() {
  const [s, setS] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    settingsService
      .get()
      .then((d) => !cancelled && setS(d))
      .catch(() => !cancelled && toast.error("Couldn't load settings."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      const updated = await settingsService.update(s);
      setS(updated);
      toast.success("Auto-assign settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save settings.");
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
  if (!s) return null;

  const num = (key: keyof WorkspaceSettings, label: string, hint: string) => (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <Input
        type="number"
        value={String(s[key] as number)}
        onChange={(e) => setS({ ...s, [key]: Number(e.target.value) })}
        disabled={!s.autoAssignEnabled}
        className="mt-1 h-10 w-32 rounded-lg"
      />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Auto-assign routing</h2>
      <p className="text-sm text-muted-foreground">
        When enabled, queued chats are pushed to the longest-idle available agent instead of
        waiting to be picked up. If an agent doesn't reply within the response window, the chat is
        reassigned to the next agent and a flag is raised for admins.
      </p>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-background/40 p-4">
        <div>
          <p className="text-sm font-medium">Enable auto-assign</p>
          <p className="text-[11px] text-muted-foreground">
            Off = agents pull from the queue (current behaviour).
          </p>
        </div>
        <Switch
          checked={s.autoAssignEnabled}
          onCheckedChange={(v) => setS({ ...s, autoAssignEnabled: v })}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {num("maxConcurrentChats", "Max chats / agent", "Cap on simultaneous chats (1–20).")}
        {num("responseTimeoutSeconds", "Response window (s)", "Reply within this or reassign (10–300).")}
        {num("maxAssignAttempts", "Max attempts", "Agents to try before escalating (1–10).")}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          className="gradient-primary text-primary-foreground"
          onClick={save}
          disabled={saving}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save settings
        </Button>
      </div>
    </div>
  );
}

function FloatingField({
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
    <div className="relative">
      <label className="absolute -top-2 left-3 z-10 bg-card px-1 text-[11px] text-muted-foreground">
        {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-lg"
      />
    </div>
  );
}
