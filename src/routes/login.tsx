import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { RoleToggle } from "@/components/auth/RoleToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Loader2, Shield, Headphones, Sparkles } from "lucide-react";

const DEMO_ACCOUNTS: Record<AppRole, { email: string; password: string }> = {
  admin: { email: "admin@frankie.demo", password: "Frankie-Admin-2026!" },
  agent: { email: "agent@frankie.demo", password: "Frankie-Agent-2026!" },
};

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Frankie" },
      { name: "description", content: "Sign in to Frankie as an admin or agent." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signInWithPassword, signUpWithPassword, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [chosenRole, setChosenRole] = useState<AppRole>("agent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: role === "admin" ? "/admin" : "/live-chats", replace: true });
    }
  }, [user, role, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signInWithPassword(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
  }


  function useDemo(r: AppRole) {
    const { email: e, password: p } = DEMO_ACCOUNTS[r];
    setChosenRole(r);
    setEmail(e);
    setPassword(p);
  }

  async function quickSignIn(r: AppRole) {
    const { email: e, password: p } = DEMO_ACCOUNTS[r];
    setChosenRole(r);
    setEmail(e);
    setPassword(p);
    setSubmitting(true);
    let { error } = await signInWithPassword(e, p);
    if (error && /invalid login credentials/i.test(error.message)) {
      const { error: signUpErr } = await signUpWithPassword(e, p, r, `Demo ${r}`);
      if (signUpErr && !/already/i.test(signUpErr.message)) {
        setSubmitting(false);
        toast.error(signUpErr.message);
        return;
      }
      ({ error } = await signInWithPassword(e, p));
    }
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Signed in as demo ${r}`);
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue helping customers.">
      <div className="mb-5">
        <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sign in as
        </Label>
        <RoleToggle value={chosenRole} onChange={setChosenRole} />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <DemoHint onUse={useDemo} onQuick={quickSignIn} busy={submitting} />
    </AuthShell>
  );
}

function DemoHint({
  onUse,
  onQuick,
  busy,
}: {
  onUse: (r: AppRole) => void;
  onQuick: (r: AppRole) => void;
  busy: boolean;
}) {
  const rows: { role: AppRole; label: string; Icon: typeof Shield }[] = [
    { role: "admin", label: "Admin", Icon: Shield },
    { role: "agent", label: "Agent", Icon: Headphones },
  ];
  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" /> Demo credentials
      </div>
      <div className="space-y-1.5">
        {rows.map(({ role, label, Icon }) => {
          const { email, password } = DEMO_ACCOUNTS[role];
          return (
            <div
              key={role}
              className="flex items-center gap-2 rounded-xl bg-background/60 px-2.5 py-2"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg gradient-primary text-primary-foreground">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[12px] font-medium">{label}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {email} · {password}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={() => onUse(role)}
                disabled={busy}
              >
                Use
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-[11px] gradient-primary text-primary-foreground"
                onClick={() => onQuick(role)}
                disabled={busy}
              >
                Sign in
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

