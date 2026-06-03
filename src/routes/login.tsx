import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import { RoleToggle } from "@/components/auth/RoleToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

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
  const { signInWithPassword, user, role, loading } = useAuth();
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

    </AuthShell>
  );
}

