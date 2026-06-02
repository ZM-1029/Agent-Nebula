import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { Check, Minus, ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/roles")({
  head: () => ({
    meta: [
      { title: "Roles & Permissions — Helix" },
      { name: "description", content: "Granular roles, permission matrix and access controls." },
    ],
  }),
  component: RolesPage,
});

const roles = [
  {
    id: "super",
    name: "Super Admin",
    color: "primary",
    count: 2,
    desc: "Unrestricted access across the workspace.",
  },
  {
    id: "mgr",
    name: "Support Manager",
    color: "blue",
    count: 5,
    desc: "Manage agents, tickets, escalations, reports.",
  },
  {
    id: "agent",
    name: "Agent",
    color: "amber",
    count: 28,
    desc: "Handle chats, tickets, customer notes.",
  },
  {
    id: "analyst",
    name: "Analyst",
    color: "violet",
    count: 4,
    desc: "Read-only access to analytics and exports.",
  },
  {
    id: "viewer",
    name: "Viewer",
    color: "rose",
    count: 9,
    desc: "Dashboard read-only, no actions.",
  },
];

const permissionMatrix = [
  { feature: "View dashboard", super: true, mgr: true, agent: true, analyst: true, viewer: true },
  { feature: "Reply to chats", super: true, mgr: true, agent: true, analyst: false, viewer: false },
  { feature: "Assign tickets", super: true, mgr: true, agent: true, analyst: false, viewer: false },
  {
    feature: "Escalate / reopen",
    super: true,
    mgr: true,
    agent: false,
    analyst: false,
    viewer: false,
  },
  { feature: "Manage agents", super: true, mgr: true, agent: false, analyst: false, viewer: false },
  {
    feature: "Edit AI settings",
    super: true,
    mgr: false,
    agent: false,
    analyst: false,
    viewer: false,
  },
  {
    feature: "Billing & API keys",
    super: true,
    mgr: false,
    agent: false,
    analyst: false,
    viewer: false,
  },
  { feature: "Export reports", super: true, mgr: true, agent: false, analyst: true, viewer: false },
];

const toneClass: Record<string, string> = {
  primary: "from-primary/25 to-primary/5 text-primary",
  blue: "from-accent-blue/25 to-accent-blue/5 text-accent-blue",
  amber: "from-accent-amber/25 to-accent-amber/5 text-accent-amber",
  violet: "from-accent-violet/25 to-accent-violet/5 text-accent-violet",
  rose: "from-accent-rose/25 to-accent-rose/5 text-accent-rose",
};

function RolesPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            Granular role-based access for your workspace.
          </p>
        </div>
        <Button className="gradient-primary text-primary-foreground">
          <Plus className="mr-1.5 h-4 w-4" /> New role
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {roles.map((r) => (
          <GlassCard key={r.id} interactive className="relative overflow-hidden">
            <div
              className={cn(
                "absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl opacity-60",
                toneClass[r.color],
              )}
            />
            <div className="relative">
              <p className="text-sm font-semibold">{r.name}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{r.desc}</p>
              <p className="mt-4 text-2xl font-semibold">
                {r.count}
                <span className="ml-1 text-xs font-normal text-muted-foreground">members</span>
              </p>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-0">
        <div className="border-b border-border/60 p-4">
          <p className="text-sm font-semibold">Permission matrix</p>
          <p className="text-[11px] text-muted-foreground">What each role can do</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase text-muted-foreground">
                <th className="p-3 font-medium">Capability</th>
                <th className="p-3 font-medium text-center">Super Admin</th>
                <th className="p-3 font-medium text-center">Manager</th>
                <th className="p-3 font-medium text-center">Agent</th>
                <th className="p-3 font-medium text-center">Analyst</th>
                <th className="p-3 font-medium text-center">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row, i) => (
                <tr key={i} className="border-b border-border/40">
                  <td className="p-3 text-xs font-medium">{row.feature}</td>
                  {(["super", "mgr", "agent", "analyst", "viewer"] as const).map((k) => (
                    <td key={k} className="p-3 text-center">
                      {row[k] ? (
                        <Check className="mx-auto h-4 w-4 text-primary" />
                      ) : (
                        <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard>
        <p className="text-sm font-semibold">Recent activity</p>
        <ol className="mt-3 space-y-2 text-xs">
          {[
            { w: "John Doe", t: "granted Manager role to Diego Alvarez", ts: "2h ago" },
            { w: "Priya Patel", t: "revoked AI settings access for Analyst", ts: "yesterday" },
            { w: "System", t: "rotated API key for production", ts: "2d ago" },
            { w: "John Doe", t: "created Viewer role with read-only dashboard", ts: "3d ago" },
          ].map((a, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl bg-background/40 p-2.5"
            >
              <span>
                <span className="font-semibold">{a.w}</span> {a.t}
              </span>
              <span className="text-[10px] text-muted-foreground">{a.ts}</span>
            </li>
          ))}
        </ol>
      </GlassCard>
    </div>
  );
}
