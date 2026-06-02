import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { Input } from "@/components/ui/input";
import { Search, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Helix" },
      { name: "description", content: "Customer profiles, plans, MRR and history." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const [q, setQ] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">No customer accounts yet</p>
        </div>
        <Button className="gradient-primary text-primary-foreground">
          <Plus className="mr-1.5 h-4 w-4" /> Add customer
        </Button>
      </div>

      <GlassCard className="p-0">
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search customers…"
              className="h-9 pl-9 bg-background/40"
            />
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted-foreground">
          <Users className="h-7 w-7 opacity-40" />
          <p className="font-medium">No customers to show</p>
          <p className="text-xs">
            Customer records will appear here once the backend customer API is available.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
