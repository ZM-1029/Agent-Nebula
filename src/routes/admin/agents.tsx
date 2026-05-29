import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { agents } from "@/lib/admin-mock/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, ChevronRight, MessageSquare, Upload, RefreshCw, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({
    meta: [
      { title: "Agents — Helix" },
      { name: "description", content: "Manage agents, status, productivity and leaderboards." },
    ],
  }),
  component: AgentsPage,
});

const statusDot: Record<string, string> = {
  online: "bg-primary",
  busy: "bg-warning",
  away: "bg-accent-amber",
  offline: "bg-muted-foreground",
};

const statusPill: Record<string, string> = {
  online: "bg-primary/15 text-primary",
  busy: "bg-warning/15 text-warning",
  away: "bg-accent-amber/15 text-accent-amber",
  offline: "bg-muted text-muted-foreground",
};

function AgentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname.startsWith("/admin/agents/")) {
    return <Outlet />;
  }

  const list = agents.filter(
    (a) =>
      (status === "all" || a.status === status) &&
      (q === "" ||
        a.name.toLowerCase().includes(q.toLowerCase()) ||
        a.role.toLowerCase().includes(q.toLowerCase())),
  );

  const counts = {
    all: agents.length,
    online: agents.filter((a) => a.status === "online").length,
    busy: agents.filter((a) => a.status === "busy").length,
    away: agents.filter((a) => a.status === "away").length,
    offline: agents.filter((a) => a.status === "offline").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">
            Team status, performance and shifts.
          </p>
        </div>
        <Button className="gradient-primary text-primary-foreground" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Add agent
        </Button>
      </div>

      <AddAgentDialog open={addOpen} onOpenChange={setAddOpen} />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { k: "all", l: "All" },
          { k: "online", l: "Online" },
          { k: "busy", l: "Busy" },
          { k: "away", l: "Away" },
          { k: "offline", l: "Offline" },
        ].map((s) => (
          <button
            key={s.k}
            onClick={() => setStatus(s.k)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              status === s.k
                ? "bg-primary text-primary-foreground"
                : "glass text-foreground hover:bg-accent",
            )}
          >
            {s.l}{" "}
            <span className="ml-1 opacity-70">
              {counts[s.k as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/40 p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or role…"
              className="pl-8 h-9 bg-background/40"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {list.length} {list.length === 1 ? "agent" : "agents"}
          </span>
        </div>

        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead className="pl-4">Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead className="text-right">Chats</TableHead>
              <TableHead className="text-right">CSAT</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((a) => {
              return (

                <TableRow
                  key={a.id}
                  onClick={() => navigate({ to: "/admin/agents/$agentId", params: { agentId: a.id } })}
                  className="cursor-pointer border-border/40"
                >
                  <TableCell className="pl-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-xs font-semibold text-primary-foreground">
                          {a.avatar}
                        </span>
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card",
                            statusDot[a.status],
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground">{a.role}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        statusPill[a.status],
                      )}
                    >
                      {a.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.shift}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{a.chats}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {a.csat ? `${a.csat}%` : "—"}
                  </TableCell>

                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                        title={`Message ${a.name}`}
                        asChild
                      >
                        <Link to="/admin/chats" search={{ agent: a.id }}>
                          <MessageSquare className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        asChild
                      >
                        <Link to="/admin/agents/$agentId" params={{ agentId: a.id }}>
                          View <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No agents match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </GlassCard>
    </div>
  );
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function AddAgentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generatePassword());
  const [showPwd, setShowPwd] = useState(false);
  const [forceReset, setForceReset] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFirstName(""); setLastName(""); setEmail("");
    setPassword(generatePassword()); setShowPwd(false); setForceReset(true);
    setAvatarPreview(null);
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { toast.error("First and last name are required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error("Enter a valid work email"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    toast.success(`Agent ${firstName} ${lastName} created`);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add agent</DialogTitle>
          <DialogDescription>
            Account & identity — the basics needed to onboard a new agent.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar preview" className="h-16 w-16 rounded-xl object-cover ring-2 ring-border" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl gradient-primary text-sm font-semibold text-primary-foreground">
                  {(firstName[0] ?? "").toUpperCase()}{(lastName[0] ?? "").toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label className="text-xs">Profile picture / avatar</Label>
              <p className="text-[11px] text-muted-foreground mb-1.5">Optional. Shown in the chat widget. Max 2MB.</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                </Button>
                {avatarPreview && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarPreview(null)}>
                    Remove
                  </Button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs">First name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" maxLength={50} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs">Last name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" maxLength={50} required />
            </div>
          </div>
          <p className="-mt-3 text-[11px] text-muted-foreground">Real name for internal HR records.</p>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Work email address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@company.com"
              maxLength={120}
              required
            />
            <p className="text-[11px] text-muted-foreground">Used for login, notifications, and password resets.</p>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Temporary password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-9 font-mono text-sm"
                  minLength={8}
                  maxLength={64}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generatePassword())} title="Generate new password">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2">
              <div>
                <p className="text-xs font-medium">Force password reset on first login</p>
                <p className="text-[11px] text-muted-foreground">Recommended for security.</p>
              </div>
              <Switch checked={forceReset} onCheckedChange={setForceReset} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="gradient-primary text-primary-foreground">Create agent</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
