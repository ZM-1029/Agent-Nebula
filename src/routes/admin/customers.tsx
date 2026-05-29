import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { customers } from "@/lib/admin-mock/data";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Customers — Helix" }, { name: "description", content: "Customer profiles, plans, MRR and history." }] }),
  component: CustomersPage,
});

const statusTone: Record<string,string> = {
  active: "bg-primary/15 text-primary",
  trial: "bg-accent-blue/15 text-accent-blue",
  churned: "bg-destructive/15 text-destructive",
};

function CustomersPage() {
  const [q, setQ] = useState("");
  const list = customers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.contact.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">{customers.length} accounts • $13.5k MRR</p>
        </div>
        <Button className="gradient-primary text-primary-foreground"><Plus className="mr-1.5 h-4 w-4" /> Add customer</Button>
      </div>

      <GlassCard className="p-0">
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search customers…" className="h-9 pl-9 bg-background/40" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3 font-medium">Account</th><th className="p-3 font-medium">Contact</th><th className="p-3 font-medium">Plan</th><th className="p-3 font-medium">MRR</th><th className="p-3 font-medium">Tickets</th><th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map(c => (
                <tr key={c.id} className="border-b border-border/40 transition hover:bg-accent/40">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-[10px] font-semibold text-primary-foreground">{c.name.split(" ").map(s=>s[0]).slice(0,2).join("")}</span>
                      <Link to="/admin/customers/$customerId" params={{ customerId: c.id }} className="font-medium hover:text-primary">{c.name}</Link>
                    </div>
                  </td>
                  <td className="p-3 text-xs"><p>{c.contact}</p><p className="text-muted-foreground">{c.email}</p></td>
                  <td className="p-3 text-xs">{c.plan}</td>
                  <td className="p-3 text-xs font-semibold">${c.mrr.toLocaleString()}</td>
                  <td className="p-3 text-xs">{c.tickets}</td>
                  <td className="p-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", statusTone[c.status])}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
