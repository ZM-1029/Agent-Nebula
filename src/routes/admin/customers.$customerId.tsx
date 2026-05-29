import { createFileRoute, Link } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { customers } from "@/lib/admin-mock/data";
import { ArrowLeft, Mail, Building2, CreditCard, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/admin/customers/$customerId")({
  head: ({ params }) => ({ meta: [{ title: `Customer ${params.customerId} — Helix` }] }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const c = customers.find(x => x.id === customerId) ?? customers[0];

  return (
    <div className="space-y-4">
      <Link to="/admin/customers" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> All customers</Link>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <GlassCard>
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-lg font-semibold text-primary-foreground">
                {c.name.split(" ").map(s=>s[0]).slice(0,2).join("")}
              </span>
              <div className="flex-1">
                <h1 className="text-xl font-semibold tracking-tight">{c.name}</h1>
                <p className="text-xs text-muted-foreground">{c.contact} • {c.email}</p>
              </div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary">{c.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {l:"Plan",v:c.plan,i:CreditCard},
                {l:"MRR",v:`$${c.mrr.toLocaleString()}`,i:Building2},
                {l:"Tickets",v:c.tickets,i:MessageSquare},
                {l:"Joined",v:c.joined,i:Mail},
              ].map(s => (
                <div key={s.l} className="rounded-2xl bg-background/40 p-3">
                  <s.i className="h-4 w-4 text-muted-foreground" />
                  <p className="mt-2 text-[10px] uppercase text-muted-foreground">{s.l}</p>
                  <p className="text-sm font-semibold">{s.v}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <p className="text-sm font-semibold">Interaction history</p>
            <ol className="relative mt-3 space-y-3 border-l border-border/60 pl-4 text-xs">
              {[
                {t:"Replied to ticket TK-4821",ts:"2h ago"},
                {t:"Upgraded plan from Pro → Enterprise",ts:"yesterday"},
                {t:"Resolved chat with John Doe",ts:"3d ago"},
                {t:"Opened complaint about webhook reliability",ts:"1w ago"},
                {t:"Renewed annual subscription",ts:"2w ago"},
              ].map((e,i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                  <p className="font-medium">{e.t}</p>
                  <p className="text-[10px] text-muted-foreground">{e.ts}</p>
                </li>
              ))}
            </ol>
          </GlassCard>

          <GlassCard>
            <p className="text-sm font-semibold">Purchase history</p>
            <table className="mt-3 w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground"><tr><th className="text-left font-medium">Date</th><th className="text-left font-medium">Item</th><th className="text-right font-medium">Amount</th></tr></thead>
              <tbody>
                {[
                  {d:"2026-05-01",i:"Enterprise annual",a:"$57,600"},
                  {d:"2025-12-12",i:"Add-on: SSO",a:"$1,200"},
                  {d:"2025-09-08",i:"Pro plan upgrade",a:"$2,880"},
                ].map((r,i) => (
                  <tr key={i} className="border-t border-border/40"><td className="py-2">{r.d}</td><td>{r.i}</td><td className="text-right font-semibold">{r.a}</td></tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Segments</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["High-value","Enterprise","NA region","Net 30","Webhook user"].map(t => <span key={t} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium">{t}</span>)}
            </div>
          </GlassCard>
          <GlassCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
            <textarea className="mt-2 h-32 w-full resize-none rounded-xl border border-border bg-background/40 p-2 text-xs outline-none focus:border-primary/40" placeholder="Add private notes…" />
          </GlassCard>
          <GlassCard>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Complaints</p>
            <div className="mt-2 space-y-2 text-xs">
              {[{t:"Webhook drop",s:"open"},{t:"Late invoice",s:"resolved"}].map((c,i)=>(
                <div key={i} className="flex items-center justify-between rounded-lg bg-background/40 px-2 py-1.5">
                  <span>{c.t}</span><span className="text-[10px] uppercase text-muted-foreground">{c.s}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
