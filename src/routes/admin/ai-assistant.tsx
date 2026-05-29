import { createFileRoute } from "@tanstack/react-router";
import { GlassCard } from "@/components/admin/glass-card";
import { Sparkles, Brain, Bot, BookOpen, ThumbsUp, ThumbsDown } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { sentimentMix } from "@/lib/admin-mock/data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — Helix" }, { name: "description", content: "AI suggested replies, sentiment, auto-categorization and bot monitoring." }] }),
  component: AIPage,
});

function AIPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Augment agents with smart replies, sentiment and auto-routing.</p>
        </div>
        <span className="rounded-full glass px-3 py-1.5 text-xs"><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary animate-pulse" /> Model online • gpt-supportive-4</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard>
          <p className="text-sm font-semibold">Suggested replies feed</p>
          <p className="text-[11px] text-muted-foreground">Live drafts for the chats your team is working on.</p>
          <div className="mt-3 space-y-3">
            {[
              { c: "Eva Brooks", t: "Upgrade synced. Want me to send a confirmation email to your billing contact as well?" },
              { c: "Marcus Field", t: "You're hitting the 1000 req/min plan limit. I can bump you to Pro+ for $80/mo if helpful." },
              { c: "Hana Park", t: "Re-running the September export now — you'll get an email when the file is ready." },
              { c: "Theo Adler", t: "Looping in our pricing manager Priya. She'll be in this thread within 30 minutes." },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">For {s.c}</p>
                <p className="mt-1 text-sm">{s.t}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="h-7 gradient-primary text-primary-foreground">Insert</Button>
                  <Button size="sm" variant="ghost" className="h-7"><ThumbsUp className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="h-7"><ThumbsDown className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard>
            <p className="text-sm font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-accent-violet" /> Sentiment mix</p>
            <p className="text-[11px] text-muted-foreground">Last 24h conversations</p>
            <div className="mt-2 flex items-center gap-3">
              <ResponsiveContainer width="50%" height={150}>
                <PieChart>
                  <Pie data={sentimentMix} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={3}>
                    {sentimentMix.map(s => <Cell key={s.label} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 text-xs">
                {sentimentMix.map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{background:s.color}} /> {s.label}</span>
                    <span className="font-semibold">{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <p className="text-sm font-semibold flex items-center gap-2"><Bot className="h-4 w-4 text-accent-blue" /> Bot monitor</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[{l:"Sessions",v:842},{l:"Handoffs",v:73},{l:"Containment",v:"91%"}].map(s => (
                <div key={s.l} className="rounded-xl bg-background/40 p-2"><p className="text-[10px] uppercase text-muted-foreground">{s.l}</p><p className="text-sm font-semibold">{s.v}</p></div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <p className="text-sm font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent-amber" /> Knowledge recs</p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {["Add article: 'Why webhook retries can take 30 minutes'","Update SSO troubleshooting page (847 views, 18% bounce)","Translate billing FAQ into German (3 weekly requests)"].map((r,i)=>(
                <li key={i} className="rounded-lg bg-background/40 p-2">{r}</li>
              ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      <GlassCard>
        <p className="text-sm font-semibold">Auto-categorization</p>
        <p className="text-[11px] text-muted-foreground">AI tagged the last 6 inbound tickets</p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {[
            {id:"TK-4823",cat:"Billing",conf:96},
            {id:"TK-4822",cat:"API / Webhooks",conf:91},
            {id:"TK-4821",cat:"Billing",conf:98},
            {id:"TK-4820",cat:"API / Rate limits",conf:88},
            {id:"TK-4819",cat:"Auth / SSO",conf:94},
            {id:"TK-4818",cat:"Export",conf:82},
          ].map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-background/40 p-2.5">
              <div>
                <p className="font-mono text-xs font-semibold text-primary">{t.id}</p>
                <p className="text-[11px]">{t.cat}</p>
              </div>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">{t.conf}%</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
