import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Helix" }, { name: "description", content: "Manage personal information and security." }] }),
  component: SettingsPage,
});

const tabs = [
  { id: "personal", label: "Personal Information", icon: User },
  { id: "security", label: "Security & Password", icon: Lock },
] as const;

type TabId = typeof tabs[number]["id"];

function SettingsPage() {
  const [tab, setTab] = useState<TabId>("personal");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground">
            <span>Dashboard</span> <span className="mx-1">/</span> <span className="font-medium text-foreground">Settings</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost">Cancel</Button>
          <Button className="gradient-primary text-primary-foreground" onClick={() => toast.success("Saved")}>Save</Button>
        </div>
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
                      tab === t.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60",
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
            {tab === "personal" ? <PersonalInfo /> : <Security />}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalInfo() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Personal Information</h2>
      <p className="text-sm text-muted-foreground">Update users Personal Information here.</p>

      <div className="mt-5">
        <div className="relative inline-block">
          <span className="flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-sm font-semibold text-primary-foreground">JD</span>
          <button className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-foreground text-background ring-2 ring-card">
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FloatingField label="First Name" defaultValue="Wade" />
        <FloatingField label="Last Name" defaultValue="Warren" />
        <div className="sm:col-span-2"><FloatingField label="Email" type="email" defaultValue="Wade.warren@gmail.com" /></div>
        <div className="sm:col-span-2"><FloatingField label="Phone" defaultValue="+91 76635131763" /></div>
      </div>
    </div>
  );
}

function Security() {
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Security & Password</h2>
      <p className="text-sm text-muted-foreground">Update your password and security settings.</p>
      <div className="mt-6 grid grid-cols-1 gap-4">
        <FloatingField label="Current Password" type="password" />
        <FloatingField label="New Password" type="password" />
        <FloatingField label="Confirm New Password" type="password" />
      </div>
    </div>
  );
}

function FloatingField({ label, type = "text", defaultValue }: { label: string; type?: string; defaultValue?: string }) {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-3 z-10 bg-card px-1 text-[11px] text-muted-foreground">{label}</label>
      <Input type={type} defaultValue={defaultValue} className="h-11 rounded-lg" />
    </div>
  );
}
